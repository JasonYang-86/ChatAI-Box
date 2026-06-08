"""
轻量级嵌入服务 - 使用 sklearn 的 TfidfVectorizer，无需 GPU/大模型。
纯 CPU 运行，首次启动即可使用，不依赖 PyTorch。

优点：零依赖安装，即开即用
缺点：语义理解不如深度学习模型，但关键词匹配+TF-IDF 对对话检索已经足够
"""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


class LightweightEmbeddingService:
    """基于 TF-IDF 的轻量级文本向量化服务"""

    def __init__(self, max_features: int = 5000):
        """
        Args:
            max_features: TF-IDF 最大特征数
        """
        print(f"[EmbeddingService] 正在初始化 TF-IDF 向量化器...")
        self.vectorizer = TfidfVectorizer(
            max_features=max_features,
            ngram_range=(1, 2),  # 1-gram + 2-gram 提升语义
        )
        self._dimension = max_features
        self._fitted = False
        self._corpus = []
        print(f"[EmbeddingService] 初始化完成，向量维度: {self._dimension}")

    @property
    def dimension(self) -> int:
        return self._dimension

    def encode(self, texts: list[str]) -> np.ndarray:
        """将文本列表编码为 TF-IDF 向量"""
        if not texts:
            return np.array([])
        if not self._fitted:
            # 首次调用时自动拟合
            self.vectorizer.fit(texts)
            self._fitted = True
            self._corpus = list(texts)
        return self.vectorizer.transform(texts).toarray()

    def encode_single(self, text: str) -> np.ndarray:
        """将单个文本编码为向量"""
        result = self.encode([text])
        return result[0] if len(result) > 0 else np.array([])

    def search(
        self,
        query: str,
        candidates: list[str],
        top_k: int = 5,
        min_score: float = 0.0,
    ) -> list[dict]:
        """
        在候选文本中搜索与 query 最相似的 top_k 条。
        """
        if not candidates:
            return []

        # 合并 query 和 candidates 来拟合/转换
        all_texts = candidates + [query]
        if not self._fitted:
            self.vectorizer.fit(all_texts)
            self._fitted = True

        all_vecs = self.vectorizer.transform(all_texts).toarray()
        candidate_vecs = all_vecs[:-1]
        query_vec = all_vecs[-1].reshape(1, -1)

        similarities = cosine_similarity(query_vec, candidate_vecs)[0]

        ranked = sorted(enumerate(similarities), key=lambda x: x[1], reverse=True)

        results = []
        for idx, score in ranked:
            if score < min_score:
                break
            results.append({
                "index": idx,
                "text": candidates[idx],
                "score": float(score),
            })
            if len(results) >= top_k:
                break

        return results
