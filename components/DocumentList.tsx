import React from 'react';
import { FileDocument } from '../types';

interface DocumentListProps {
  documents: FileDocument[];
}

const DocumentList: React.FC<DocumentListProps> = ({ documents }) => {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Knowledge Base ({documents.length})
      </h2>
      
      {documents.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No documents uploaded.</p>
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
                      <span>{doc.status === 'processing' ? 'Processing...' : 'Ready'}</span>
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
                   <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1"></div>
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