export interface EmbeddingResult {
  vector: number[];
  tokens: number;
}

let embeddingConfig: {
  apiKey: string;
  baseUrl: string;
  model: string;
} | null = null;

export function setEmbeddingConfig(config: {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}) {
  embeddingConfig = {
    apiKey: config.apiKey,
    baseUrl: (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: config.model || 'text-embedding-3-small',
  };
}

export async function createEmbedding(text: string): Promise<EmbeddingResult> {
  if (!embeddingConfig) {
    throw new Error('未配置 Embedding 服务，请先在设置中配置一个模型');
  }

  const response = await fetch(`${embeddingConfig.baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${embeddingConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: embeddingConfig.model,
      input: text.replace(/\n/g, ' ').trim(),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return {
    vector: data.data[0].embedding,
    tokens: data.usage?.total_tokens || 0,
  };
}

export async function createEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  if (!embeddingConfig) {
    throw new Error('未配置 Embedding 服务');
  }

  const results: EmbeddingResult[] = [];
  const batchSize = 10;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map((t) => t.replace(/\n/g, ' ').trim());

    const response = await fetch(`${embeddingConfig.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${embeddingConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: embeddingConfig.model,
        input: batch,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Batch embedding error ${response.status}: ${err}`);
    }

    const data = await response.json();
    for (const item of data.data) {
      results.push({
        vector: item.embedding,
        tokens: data.usage?.total_tokens
          ? Math.ceil(data.usage.total_tokens / batch.length)
          : 0,
      });
    }
  }

  return results;
}
