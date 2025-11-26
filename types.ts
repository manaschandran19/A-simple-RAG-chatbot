export interface User {
  username: string;
  passwordHash: string; // SHA-256
  createdAt: number;
}

export interface FileDocument {
  id: string;
  ownerId: string; // Scoped to user
  name: string;
  type: string;
  content: string; // Full extracted text
  status: 'processing' | 'ready' | 'error';
  tokenCount?: number;
  version: number;
  timestamp: number;
}

export interface TextChunk {
  id: string;
  documentId: string;
  documentName: string;
  text: string;
  embedding?: number[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  sources?: SourceCitation[];
}

export interface SourceCitation {
  documentName: string;
  snippet: string;
  relevanceScore: number;
}

export enum ProcessingState {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  EMBEDDING = 'EMBEDDING',
  READY = 'READY',
}

// Declarations for global libraries loaded via CDN
declare global {
  interface Window {
    pdfjsLib: any;
    mammoth: any;
    XLSX: any;
    idb: any;
  }
}