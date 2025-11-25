import { GoogleGenAI, EmbedContentResponse } from "@google/genai";
import { TextChunk, SourceCitation } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Constants
const EMBEDDING_MODEL = 'text-embedding-004';
const GENERATION_MODEL = 'gemini-3-pro-preview';

/**
 * Generate embedding for a single text string.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const response: EmbedContentResponse = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
    });
    
    // Access the embeddings array. Since we sent a single text content, we expect the first embedding.
    const embedding = response.embeddings?.[0];
    
    if (!embedding || !embedding.values) {
      throw new Error("No embedding returned");
    }
    return embedding.values;
  } catch (error) {
    console.error("Embedding generation failed:", error);
    throw error;
  }
};

/**
 * Batch process embeddings to avoid hitting rate limits too aggressively.
 * (Simple sequential implementation for client-side demo)
 */
export const embedChunks = async (chunks: TextChunk[]): Promise<TextChunk[]> => {
  const embeddedChunks: TextChunk[] = [];
  
  // Process in small batches or sequentially to ensure stability
  for (const chunk of chunks) {
    try {
      const embedding = await generateEmbedding(chunk.text);
      embeddedChunks.push({ ...chunk, embedding });
      // Small delay to be polite to the API in a loop
      await new Promise(resolve => setTimeout(resolve, 50)); 
    } catch (e) {
      console.warn(`Failed to embed chunk ${chunk.id}`, e);
    }
  }
  return embeddedChunks;
};

/**
 * Cosine Similarity
 */
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
};

/**
 * Retrieve top K most relevant chunks
 */
export const retrieveContext = async (query: string, chunks: TextChunk[], topK: number = 5): Promise<SourceCitation[]> => {
  if (chunks.length === 0) return [];
  
  const queryEmbedding = await generateEmbedding(query);
  
  const scoredChunks = chunks.map(chunk => {
    if (!chunk.embedding) return { ...chunk, score: -1 };
    return {
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    };
  });

  // Sort by score descending
  scoredChunks.sort((a, b) => b.score - a.score);
  
  // Filter for relevance threshold (simple heuristic)
  const relevant = scoredChunks.filter(c => c.score > 0.45).slice(0, topK);

  return relevant.map(c => ({
    documentName: c.documentName,
    snippet: c.text,
    relevanceScore: c.score
  }));
};

/**
 * Generate Answer using RAG
 */
export const generateRAGResponse = async (query: string, context: SourceCitation[]): Promise<string> => {
  
  // If no context is found, return the fallback immediately to save a call or strictly enforce.
  // However, we let the model decide if the little context it has is enough, 
  // but we guide it strongly.
  
  const contextText = context.map((c, i) => `[Document: ${c.documentName} (Snippet ${i+1})]\n${c.snippet}`).join("\n\n");
  
  const systemInstruction = `
    System Role:
You are a Retrieval-Augmented Generation (RAG) assistant. You must answer the user’s question strictly and exclusively using the information contained in the Provided Context.

Core Obligations

Use ONLY the Provided Context.

Do not rely on prior knowledge, assumptions, or external facts.

Do not infer information that is not explicitly present.

If the answer is not fully supported by the Context:
Respond with:
“I couldn’t find this information in the provided documents.”

Cite the Context sources clearly for every factual claim.

Example: “According to Document A…”

Use the document names or IDs exactly as given.

Stay accurate, concise, and professional.

Do NOT hallucinate or combine partial hints into unsupported conclusions.

Response Format

Direct Answer: Only what is supported by the Context.

Citations: Mention supporting document names/IDs.

If insufficient information: Use the required fallback sentence.

Example Behavior

Good:
“According to Policy.pdf, the reimbursement limit is ₹50,000.”

Bad:
“It’s likely the reimbursement limit is around ₹50,000 based on typical policies.” (❌ Inference)
  `;

  const prompt = `
    Context:
    ${contextText.length > 0 ? contextText : "No relevant documents found."}

    User Question: 
    ${query}
  `;

  try {
    const response = await ai.models.generateContent({
      model: GENERATION_MODEL,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1, // Low temperature for factual accuracy
      }
    });

    return response.text ?? "I couldn't generate a response.";
  } catch (error) {
    console.error("RAG Generation failed:", error);
    return "An error occurred while generating the response.";
  }
};