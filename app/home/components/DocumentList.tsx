import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DocumentRecord, documentStore } from '../clients/DocumentStore';
import { formatShortDate } from '../utils/dateFormatters';

interface DocumentListProps {
  currentDocumentId?: string;
  onOpen?: (id: string) => void;
}

export function DocumentList({ currentDocumentId, onOpen }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setIsLoading(true);
        const result = await documentStore.list();
        
        if (result.ok) {
          const docs = result.val
          setDocuments(docs);
        } else {
          throw new Error(result.val.message);
        }
      } catch (error) {
        console.error('Failed to load documents:', error);
        toast.error('Failed to load documents');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const result = await documentStore.remove(id);
      if (result.ok) {
        setDocuments(docs => docs.filter(doc => doc.id !== id));
        toast.success('Document deleted successfully');
      } else {
        throw new Error(result.val.message);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    try {
      const result = await documentStore.rename(id, renameValue.trim());
      if (result.ok) {
        setDocuments(docs => docs.map(doc => doc.id === id ? { ...doc, displayName: renameValue.trim() } : doc));
        toast.success('Document renamed successfully');
        setRenamingId(null);
        setRenameValue('');
      } else {
        throw new Error(result.val.message);
      }
    } catch (error) {
      console.error('Failed to rename document:', error);
      toast.error('Failed to rename document');
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading documents...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Your Documents</h2>
      <div className="space-y-2">
        {documents.length === 0 ? (
          <p className="text-gray-500">No documents found</p>
        ) : (
          documents.map((doc) => (
            !doc.id ? null : (
              <div
                key={doc.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  currentDocumentId === doc.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  {renamingId === doc.id ? (
                    <input
                      aria-label="Rename document"
                      role="textbox"
                      className="border rounded px-2 py-1 text-sm"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      autoFocus
                      maxLength={100}
                      style={{ width: 140 }}
                      onBlur={() => setRenamingId(null)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleRename(doc.id as string);
                        } else if (e.key === 'Escape') {
                          setRenamingId(null);
                          setRenameValue('');
                        }
                      }}
                    />
                  ) : (
                    <span
                      className="text-sm cursor-pointer hover:underline"
                      tabIndex={0}
                      role="button"
                      aria-label="Edit document name"
                      onClick={() => {
                        setRenamingId(doc.id as string);
                        setRenameValue(doc.displayName ?? '');
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setRenamingId(doc.id as string);
                          setRenameValue(doc.displayName ?? '');
                        }
                      }}
                    >
                      {doc.displayName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {doc.lastModified ? formatShortDate(doc.lastModified) : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpen?.(doc.id as string)}
                  >
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id as string)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          ))
        )}
      </div>
    </div>
  );
} 