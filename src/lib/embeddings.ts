const OPENAI_KEY = () => process.env.OPENAI_API_KEY || "";

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const key = OPENAI_KEY();
  if (!key || texts.length === 0) return [];

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: texts.map(t => t.slice(0, 512)),
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? [])
      .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
      .map((d: { embedding: number[] }) => d.embedding);
  } catch {
    return [];
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function semanticRank<T extends { name: string; description: string; ai_summary: string; match_score: number }>(
  query: string,
  items: T[]
): Promise<T[]> {
  if (items.length === 0) return items;

  const key = OPENAI_KEY();
  if (!key) return items;

  const itemTexts = items.map(
    item => `${item.name} ${item.description} ${item.ai_summary}`.slice(0, 512)
  );

  const allTexts = [query, ...itemTexts];
  const embeddings = await getEmbeddings(allTexts);

  if (embeddings.length !== allTexts.length) return items;

  const queryEmb = embeddings[0];
  const scored = items.map((item, i) => {
    const sim = cosineSimilarity(queryEmb, embeddings[i + 1]);
    const semanticScore = (sim + 1) / 2;
    const blended = item.match_score * 0.4 + semanticScore * 0.6;
    return { ...item, match_score: Math.round(blended * 100) / 100 };
  });

  scored.sort((a, b) => b.match_score - a.match_score);
  return scored;
}
