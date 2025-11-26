import { GoogleGenAI, EmbedContentResponse } from "@google/genai";
import { TextChunk, SourceCitation } from '../types';
import { db } from './db';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Constants
const EMBEDDING_MODEL = 'text-embedding-004';
const GENERATION_MODEL = 'gemini-3-pro-preview';

/**
 * Generate embedding for a single text string with retry logic.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  // 1. Validate Input
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot embed empty text");
  }

  // 2. Retry Logic
  const maxRetries = 3;
  let attempt = 0;

  while (true) {
    try {
      const response: EmbedContentResponse = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text,
      });
      
      // Access the embeddings array.
      const embedding = response.embeddings?.[0];
      
      if (!embedding || !embedding.values) {
        throw new Error("No embedding returned from API");
      }
      return embedding.values;
    } catch (error: any) {
      attempt++;
      
      // Check if error is a transient 500/Internal error
      const isInternalError = 
        error.status === 500 || 
        error.code === 500 || 
        error.status === 'INTERNAL' ||
        (error.message && error.message.includes('Internal error'));

      if (isInternalError && attempt <= maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.warn(`Embedding API 500 Error (Attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If not retryable or max retries reached, throw
      console.error("Embedding generation failed permanently:", error);
      throw error;
    }
  }
};

/**
 * Batch process embeddings
 */
export const embedChunks = async (chunks: TextChunk[]): Promise<TextChunk[]> => {
  const embeddedChunks: TextChunk[] = [];
  
  for (const chunk of chunks) {
    try {
      // Small delay between requests to avoid hitting rate limits (429) too hard
      await new Promise(resolve => setTimeout(resolve, 100)); 
      
      const embedding = await generateEmbedding(chunk.text);
      embeddedChunks.push({ ...chunk, embedding });
    } catch (e) {
      // Log but continue processing other chunks so one failure doesn't stop the whole file
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
 * Retrieve top K most relevant chunks from Database
 */
export const retrieveContext = async (query: string, userId: string, topK: number = 10): Promise<SourceCitation[]> => {
  
  // 1. Generate Query Vector
  const queryEmbedding = await generateEmbedding(query);
  
  // 2. Fetch ALL vectors for this user from the Database
  // In a production Vector DB, the DB would handle the similarity search.
  // Since we are using IndexedDB as a local Vector DB, we fetch and calculate here.
  const chunks = await db.getAllVectorsByUser(userId);

  if (chunks.length === 0) return [];

  // 3. Compute Scores
  const scoredChunks = chunks.map(chunk => {
    if (!chunk.embedding) return { ...chunk, score: -1 };
    return {
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    };
  });

  // 4. Sort and Top-K
  scoredChunks.sort((a, b) => b.score - a.score);
  
  // Lower threshold slightly to ensure we capture potentially relevant context that uses synonyms
  const relevant = scoredChunks.filter(c => c.score > 0.30).slice(0, topK);

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
  
  // Format context for the prompt
  const contextText = context.map((c, i) => `[[Source: ${c.documentName}]]\n${c.snippet}`).join("\n\n");
  
  const systemInstruction = `
You are an expert document analysis assistant. Your goal is to answer the user's question accurately, comprehensively, and strictly using *only* the provided context chunks.

### Core Instructions:
1. **Synthesis**: Do not just list snippets. Analyze the provided text and synthesize a coherent, flowing answer that directly addresses the user's intent. combine information from different chunks if needed.
2. **Strict Grounding**: Use ONLY the information provided in the "Context" section below. Do not use outside knowledge or make assumptions. 
3. **Handling Missing Info**: If the context does not contain enough information to answer the specific question, explicitly state: "I couldn't find specific information regarding [topic] in the provided documents."
4. **Citations**: You must cite your sources. When you mention a fact, derived from a document, reference the source filename in brackets immediately after the statement (e.g., "The standard plan includes dental coverage [Benefits.pdf].").
5. **Tone**: Be professional, helpful, empathetic and  direct.
  `;

  const prompt = `
### Context Data (Trusted Knowledge Base):
${contextText.length > 0 ? contextText : "No relevant documents found matching the query."}

### User Question: 
${query}

### Answer:
  `;

  try {
    const response = await ai.models.generateContent({
      model: GENERATION_MODEL,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, // Slightly increased to allow better synthesis while remaining grounded
      }
    });

    return response.text ?? "I couldn't generate a response.";
  } catch (error) {
    console.error("RAG Generation failed:", error);
    return "An error occurred while generating the response.";
  }
};