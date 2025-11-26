import { FileDocument, TextChunk, User } from '../types';

const DB_NAME = 'GeminiRAG_DB';
const DB_VERSION = 1;

/**
 * Client-Side Vector Database Service
 * Uses IndexedDB to store Users, Documents, and Vectors persistently.
 */
class VectorDatabase {
  private dbPromise: Promise<any>;

  constructor() {
    if (!window.idb) {
      throw new Error("IDB library not loaded");
    }
    this.dbPromise = window.idb.openDB(DB_NAME, DB_VERSION, {
      upgrade(db: any) {
        // User Store
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'username' });
        }
        
        // Documents Store
        if (!db.objectStoreNames.contains('documents')) {
          const docStore = db.createObjectStore('documents', { keyPath: 'id' });
          docStore.createIndex('ownerId', 'ownerId');
          docStore.createIndex('name', 'name');
        }

        // Vectors Store
        if (!db.objectStoreNames.contains('vectors')) {
          const vecStore = db.createObjectStore('vectors', { keyPath: 'id' });
          vecStore.createIndex('documentId', 'documentId');
        }
      },
    });
  }

  // --- User Operations ---

  async createUser(user: User): Promise<void> {
    const db = await this.dbPromise;
    await db.put('users', user);
  }

  async getUser(username: string): Promise<User | undefined> {
    const db = await this.dbPromise;
    return await db.get('users', username);
  }

  // --- Document Operations ---

  async saveDocument(doc: FileDocument, chunks: TextChunk[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(['documents', 'vectors'], 'readwrite');
    
    // Save metadata
    await tx.objectStore('documents').put(doc);
    
    // Save vectors
    const vectorStore = tx.objectStore('vectors');
    for (const chunk of chunks) {
      await vectorStore.put(chunk);
    }
    
    await tx.done;
  }

  async getDocumentsByUser(username: string): Promise<FileDocument[]> {
    const db = await this.dbPromise;
    return await db.getAllFromIndex('documents', 'ownerId', username);
  }

  async deleteDocument(docId: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(['documents', 'vectors'], 'readwrite');
    
    // Delete doc
    await tx.objectStore('documents').delete(docId);
    
    // Delete associated vectors
    // Note: IndexedDB doesn't cascade delete, so we iterate index
    const vectorStore = tx.objectStore('vectors');
    const index = vectorStore.index('documentId');
    let cursor = await index.openCursor(IDBKeyRange.only(docId));
    
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    
    await tx.done;
  }

  async deleteDocumentsByName(username: string, filename: string): Promise<void> {
    const docs = await this.getDocumentsByUser(username);
    const targetDocs = docs.filter(d => d.name === filename);
    
    for (const doc of targetDocs) {
      await this.deleteDocument(doc.id);
    }
  }

  // --- Vector Operations ---

  async getAllVectorsByUser(username: string): Promise<TextChunk[]> {
    const db = await this.dbPromise;
    
    // 1. Get all doc IDs for user
    const userDocs = await this.getDocumentsByUser(username);
    const docIds = new Set(userDocs.map(d => d.id));
    
    if (docIds.size === 0) return [];

    // 2. Fetch all vectors (Optimization: In a real Prod DB, we'd use a cursor or range, 
    // but IDB requires iteration or getting all and filtering)
    // For this demo, we get all vectors and filter in memory. 
    // A more advanced approach involves a compound index or separate stores per user.
    const allVectors: TextChunk[] = await db.getAll('vectors');
    
    return allVectors.filter(v => docIds.has(v.documentId));
  }
}

export const db = new VectorDatabase();
