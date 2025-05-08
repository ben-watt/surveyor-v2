import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { documentStore } from '../clients/DocumentStore';

interface DocumentListProps {
  currentDocumentId?: string;
  onOpen?: (id: string) => void;
}

export function DocumentList({ currentDocumentId, onOpen }: DocumentListProps) {
  const [documents, setDocuments] = useState<Array<{
    id: string;
    displayName: string;
    lastModified: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setIsLoading(true);
        const result = await documentStore.list();
        
        if (result.ok) {
          const docs = result.val
            .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
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
                <span className="text-sm">{doc.displayName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {new Date(doc.lastModified).toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpen?.(doc.id)}
                >
                  Open
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 