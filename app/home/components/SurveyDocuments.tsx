import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, MoreVertical, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DocumentRecord, documentStore } from '@/app/home/clients/DocumentStore';

interface SurveyDocumentsProps {
  surveyId: string;
  className?: string;
}

export const SurveyDocuments: React.FC<SurveyDocumentsProps> = ({ surveyId, className }) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await documentStore.list();
      if (result.ok) {
        const surveyDocs = result.val
          .filter((doc) => doc.id === surveyId)
          .sort((a, b) => {
            const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return bDate - aDate;
          });
        setDocuments(surveyDocs);
        setError(null);
      } else {
        setError('Failed to load documents');
      }
    } catch (err) {
      setError('An error occurred while loading documents');
    } finally {
      setIsLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleDelete = async (docId: string) => {
    const confirmDelete = window.confirm(
      'Delete this document? You can regenerate it from the survey if needed.',
    );
    if (!confirmDelete) return;

    setDeletingId(docId);
    try {
      const result = await documentStore.remove(docId);
      if (result.ok) {
        toast.success('Document deleted');
        await loadDocuments();
      } else {
        toast.error('Failed to delete document');
      }
    } catch (err) {
      toast.error('Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" role="status">
          <span className="sr-only">Loading documents...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="p-4 text-center">
        <Button
          type="button"
          onClick={() => router.push(`/home/editor/${surveyId}?templateId=building-survey`)}
        >
          Generate report
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className ?? ''}`}>
      {documents.map((doc) => {
        const versionNumber =
          typeof doc.currentVersion === 'number'
            ? doc.currentVersion
            : typeof doc.version === 'number'
            ? doc.version
            : null;
        const updatedOn = doc.updatedAt ? format(new Date(doc.updatedAt), 'dd/MM/yyyy') : 'N/A';
        const displayName = doc.displayName || 'Survey document';

        const handleOpen = () => {
          router.push(`/home/editor/${doc.id}`);
        };

        return (
          <div
            key={`${doc.id}-${doc.updatedAt ?? doc.currentVersion ?? doc.version ?? 'latest'}`}
            className="group relative flex cursor-pointer flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            role="button"
            tabIndex={0}
            onClick={handleOpen}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleOpen();
              }
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <h3 className="text-base font-medium text-foreground group-hover:text-primary">
                  {displayName}
                </h3>
                <div className="text-sm text-muted-foreground">
                  {versionNumber !== null && <span>Version {versionNumber} • </span>}
                  <span>Updated {updatedOn}</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={`Document actions for ${displayName}`}
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(event) => {
                      event.preventDefault();
                      if(doc.id) handleDelete(doc.id);
                    }}
                    disabled={deletingId === doc.id}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingId === doc.id ? 'Deleting…' : 'Delete'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
};
