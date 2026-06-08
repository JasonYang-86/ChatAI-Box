"""
向量嵌入服务 - 负责将文本转换为向量，支持语义相似度搜索。
使用 sentence-transformers 本地模型，无需调用外部 API。
"""

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


class EmbeddingService:
    """文本向量化与语义搜索服务"""

    # 使用轻量级中文+英文模型，首次运行会自动下载（约 400MB）
    DEFAULT_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"

    def __init__(self, model_name: str = None):
        """
        初始化嵌入服务。

        Args:
            model_name: sentence-transformers 模型名称。
                        默认使用多语言 MiniLM，支持中英文混合。
                        其他推荐：
                        - 'all-MiniLM-L6-v2'（仅英文，更轻量）
                        - 'BAAI/bge-small-zh-v1.5'（中文优化）
        """
        model_name = model_name or self.DEFAULT_MODEL
        print(f"[EmbeddingService] 正在加载模型: {model_name} ...")
        self.model = SentenceTransformer(model_name)
        self._dimension = self.model.get_sentence_embedding_dimension()
        print(f"[EmbeddingService] 模型加载完成，向量维度: {self._dimension}")

    @property
    def dimension(self) -> int:
        """向量维度"""
        return self._dimension

    def encode(self, texts: list[str]) -> np.ndarray:
        """
        将文本列表编码为向量。

        Args:
            texts: 文本列表

        Returns:
            shape=(len(texts), dimension) 的 numpy 数组
        """
        if not texts:
            return np.array([])
        embeddings = self.model.encode(texts, normalize_embeddings=True)
        return np.array(embeddings)

    def encode_single(self, text: str) -> np.ndarray:
        """将单个文本编码为向量"""
        return self.encode([text])[0]

    def search(
        self,
        query: str,
        candidates: list[str],
        top_k: int = 5,
        min_score: float = 0.0,
    ) -> list[dict]:
        """
        在候选文本中搜索与 query 最相似的 top_k 条。

        Args:
            query: 查询文本
            candidates: 候选文本列表
            top_k: 返回数量
            min_score: 最低相似度阈值（0~1）

        Returns:
            [{"index": int, "text": str, "score": float}, ...]，按相似度降序
        """
        if not candidates:
            return []

        query_vec = self.encode_single(query).reshape(1, -1)
        candidate_vecs = self.encode(candidates)

        similarities = cosine_similarity(query_vec, candidate_vecs)[0]

        # 排序取 top_k
        ranked = sorted(
            enumerate(similarities), key=lambda x: x[1], reverse=True
        )

        results = []
        for idx, score in ranked:
            if score < min_score:
                break
            results.append({"index": idx, "text": candidates[idx], "score": float(score)})
            if len(results) >= top_k:
                break

        return results
