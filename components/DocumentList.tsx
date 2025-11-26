import React from 'react';
import { FileDocument } from '../types';

interface DocumentListProps {
  documents: FileDocument[];
  onDelete?: (id: string) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ documents, onDelete }) => {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Knowledge Base ({documents.length})
      </h2>
      
      {documents.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No documents in database.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id} className="group relative bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex-shrink-0 w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <span className="text-xs font-bold uppercase">{doc.type}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800 truncate" title={doc.name}>
                        {doc.name}
                      </p>
                      {doc.version > 1 && (
                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded">
                          v{doc.version}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{doc.status === 'processing' ? 'Indexing...' : 'Indexed'}</span>
                      {doc.timestamp && (
                        <>
                          <span>•</span>
                          <span>{new Date(doc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {doc.status === 'processing' ? (
                   <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mt-1"></div>
                ) : (
                   <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1"></div>
                      {onDelete && (
                        <button 
                          onClick={() => onDelete(doc.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete from Database"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                   </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DocumentList;
