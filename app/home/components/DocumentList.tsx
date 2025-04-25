import React from 'react';
import { list } from 'aws-amplify/storage';
import { Button } from '@/components/ui/button';
import { FileText, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { remove } from 'aws-amplify/storage';
import toast from 'react-hot-toast';

interface DocumentListProps {
  userId: string;
  tenantId: string;
  currentDocumentId?: string;
}

export function DocumentList({ userId, tenantId, currentDocumentId }: DocumentListProps) {
  const router = useRouter();
  const [documents, setDocuments] = React.useState<{ key: string; lastModified: Date }[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadDocuments = async () => {
      try {
        setIsLoading(true);
        const prefix = `editor/${userId}/${tenantId}/`;
        const result = await list({ path: prefix });
        
        // Filter out any non-document items and map to the required format
        const docs = result.items
          .filter(item => item.path !== prefix) // Exclude the prefix itself
          .map(item => ({
            key: item.path,
            lastModified: item.lastModified ? new Date(item.lastModified) : new Date()
          }))
          .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
        
        setDocuments(docs);
      } catch (error) {
        console.error('Failed to load documents:', error);
        toast.error('Failed to load documents');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [userId, tenantId]);

  const handleDelete = async (key: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await remove({ path: key });
      setDocuments(docs => docs.filter(doc => doc.key !== key));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getDocumentId = (key: string) => {
    const parts = key.split('/');
    return parts[parts.length - 1];
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
          documents.map((doc) => {
            const docId = getDocumentId(doc.key);
            return (
              <div
                key={doc.key}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  currentDocumentId === docId
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{docId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {doc.lastModified.toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/home/editor/${docId}`)}
                  >
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.key)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
} 