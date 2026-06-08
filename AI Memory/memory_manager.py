"""
记忆管理器 - 对话存储、检索、上下文构建的核心模块。

数据存储在本地 JSON 文件中，结构如下：
{
    "version": "1.0",
    "conversations": [
        {
            "id": "uuid",
            "timestamp": "ISO8601",
            "topic": "对话主题摘要",
            "tags": ["tag1"],
            "messages": [
                {"role": "user", "content": "..."},
                {"role": "assistant", "content": "..."}
            ],
            "embedding": [0.1, 0.2, ...]
        }
    ]
}
"""

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from lightweight_embedding import LightweightEmbeddingService


class MemoryManager:
    """本地对话记忆管理器"""

    def __init__(
        self,
        storage_path: str = "memory.json",
        embedding_service: LightweightEmbeddingService = None,
    ):
        """
        Args:
            storage_path: JSON 存储文件路径
            embedding_service: 向量嵌入服务实例，不传则自动创建（默认 TF-IDF）
        """
        self.storage_path = storage_path
        self.embedding_service = embedding_service or LightweightEmbeddingService()
        self._data = self._load()

    # ========== 文件 I/O ==========

    def _load(self) -> dict:
        """从文件加载数据"""
        if os.path.exists(self.storage_path):
            with open(self.storage_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            # 兼容旧格式：确保 conversations 是列表
            if "conversations" not in data:
                data["conversations"] = []
            return data
        return {"version": "1.0", "conversations": []}

    def _save(self):
        """保存数据到文件"""
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(self._data, f, ensure_ascii=False, indent=2)

    # ========== CRUD ==========

    def add_conversation(
        self,
        messages: list[dict],
        topic: str = "",
        tags: list[str] = None,
        auto_embed: bool = True,
    ) -> str:
        """
        添加一条对话记录。

        Args:
            messages: [{"role": "user/assistant", "content": "..."}, ...]
            topic: 对话主题摘要，为空则自动用首条用户消息作为主题
            tags: 标签列表
            auto_embed: 是否自动生成嵌入向量

        Returns:
            对话 ID
        """
        conv_id = uuid.uuid4().hex[:12]

        # 自动生成主题
        if not topic:
            first_user_msg = next(
                (m["content"] for m in messages if m["role"] == "user"), ""
            )
            topic = first_user_msg[:80] + ("..." if len(first_user_msg) > 80 else "")

        conversation = {
            "id": conv_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "topic": topic,
            "tags": tags or [],
            "messages": messages,
            "embedding": None,
        }

        if auto_embed:
            conversation["embedding"] = self._compute_embedding_for_conv(conversation)

        self._data["conversations"].append(conversation)
        self._save()
        return conv_id

    def get_conversation(self, conv_id: str) -> Optional[dict]:
        """根据 ID 获取对话"""
        for conv in self._data["conversations"]:
            if conv["id"] == conv_id:
                return conv
        return None

    def delete_conversation(self, conv_id: str) -> bool:
        """删除对话，返回是否成功"""
        before = len(self._data["conversations"])
        self._data["conversations"] = [
            c for c in self._data["conversations"] if c["id"] != conv_id
        ]
        if len(self._data["conversations"]) < before:
            self._save()
            return True
        return False

    def list_conversations(self, limit: int = 20) -> list[dict]:
        """列出最近的对话（仅返回摘要信息，不含完整消息）"""
        convs = sorted(
            self._data["conversations"],
            key=lambda c: c["timestamp"],
            reverse=True,
        )
        return [
            {
                "id": c["id"],
                "timestamp": c["timestamp"],
                "topic": c["topic"],
                "tags": c["tags"],
                "message_count": len(c["messages"]),
            }
            for c in convs[:limit]
        ]

    # ========== 搜索 ==========

    def search(
        self,
        query: str,
        top_k: int = 5,
        min_score: float = 0.0,
        include_messages: bool = False,
    ) -> list[dict]:
        """
        语义搜索历史对话。

        Args:
            query: 搜索查询
            top_k: 返回条数
            min_score: 最低相似度阈值
            include_messages: 是否包含完整消息内容

        Returns:
            匹配的对话列表，按相似度降序
        """
        if not self._data["conversations"]:
            return []

        # 确保所有对话都有嵌入
        self._ensure_embeddings()

        # 提取所有嵌入向量
        embeddings = []
        valid_convs = []
        for conv in self._data["conversations"]:
            emb = conv.get("embedding")
            if emb is not None:
                embeddings.append(emb)
                valid_convs.append(conv)

        if not embeddings:
            return []

        # 计算相似度
        query_vec = self.embedding_service.encode_single(query).reshape(1, -1)
        emb_matrix = np.array(embeddings)
        similarities = cosine_similarity(query_vec, emb_matrix)[0]

        # 排序
        ranked = sorted(enumerate(similarities), key=lambda x: x[1], reverse=True)

        results = []
        for idx, score in ranked:
            if score < min_score:
                break
            conv = valid_convs[idx]
            result = {
                "id": conv["id"],
                "timestamp": conv["timestamp"],
                "topic": conv["topic"],
                "tags": conv["tags"],
                "score": float(score),
            }
            if include_messages:
                result["messages"] = conv["messages"]
            results.append(result)
            if len(results) >= top_k:
                break

        return results

    # ========== 上下文构建 ==========

    def build_context(
        self,
        query: str,
        top_k: int = 5,
        min_score: float = 0.3,
        max_context_chars: int = 8000,
    ) -> str:
        """
        为当前对话构建历史记忆上下文，可直接注入 LLM 的 system prompt。

        流程：语义搜索 → 按相似度排序 → 截断到 max_context_chars。

        Args:
            query: 当前用户问题
            top_k: 最多检索的对话数
            min_score: 最低相似度阈值
            max_context_chars: 上下文最大字符数（避免超出模型窗口）

        Returns:
            格式化的上下文字符串，无匹配时返回空字符串
        """
        results = self.search(query, top_k=top_k, min_score=min_score, include_messages=True)

        if not results:
            return ""

        lines = ["## 历史相关对话记录\n"]
        total_chars = len(lines[0])

        for r in results:
            # 格式化一条记录
            block = self._format_conversation_block(r)
            if total_chars + len(block) > max_context_chars:
                # 截断：只保留部分消息
                truncated = self._format_conversation_block(r, max_messages=2)
                if total_chars + len(truncated) <= max_context_chars:
                    lines.append(truncated)
                break
            lines.append(block)
            total_chars += len(block)

        return "\n".join(lines)

    def _format_conversation_block(self, result: dict, max_messages: int = None) -> str:
        """格式化单条对话记录"""
        timestamp = result["timestamp"][:19].replace("T", " ")
        lines = [
            f"### [{result['score']:.0%}] {result['topic']}",
            f"时间: {timestamp}",
            f"---",
        ]
        messages = result["messages"]
        if max_messages:
            messages = messages[:max_messages]

        for msg in messages:
            role_label = "用户" if msg["role"] == "user" else "助手"
            content = msg["content"]
            if len(content) > 500:
                content = content[:500] + "..."
            lines.append(f"**{role_label}**: {content}")

        lines.append("")  # 空行分隔
        return "\n".join(lines)

    # ========== 内部辅助 ==========

    def _compute_embedding_for_conv(self, conversation: dict) -> list:
        """为对话计算嵌入向量（使用 topic + 首条消息作为文本）"""
        text = conversation["topic"]
        # 加入更多上下文
        if conversation["messages"]:
            first_content = conversation["messages"][0]["content"][:500]
            text = text + " " + first_content
        vec = self.embedding_service.encode_single(text)
        return vec.tolist()

    def _ensure_embeddings(self):
        """确保所有对话都有嵌入向量（兼容增量更新）"""
        needs_save = False
        for conv in self._data["conversations"]:
            if conv.get("embedding") is None:
                conv["embedding"] = self._compute_embedding_for_conv(conv)
                needs_save = True
        if needs_save:
            self._save()

    def rebuild_embeddings(self):
        """重建所有对话的嵌入向量（切换模型后使用）"""
        for conv in self._data["conversations"]:
            conv["embedding"] = self._compute_embedding_for_conv(conv)
        self._save()
        print(f"已重建 {len(self._data['conversations'])} 条对话的嵌入向量")

    @property
    def count(self) -> int:
        """总对话数"""
        return len(self._data["conversations"])
