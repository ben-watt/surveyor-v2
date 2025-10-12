import React, { useEffect, useState } from 'react';
import { FileText, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { DocumentRecord, documentStore } from '@/app/home/clients/DocumentStore';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface SurveyDocumentsProps {
  surveyId: string;
  className?: string;
}

export const SurveyDocuments: React.FC<SurveyDocumentsProps> = ({ surveyId, className }) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setIsLoading(true);
        const result = await documentStore.list();
        if (result.ok) {
          const surveyDocs = result.val.filter((doc) => doc.id === surveyId);
          setDocuments(surveyDocs);
        } else {
          setError('Failed to load documents');
        }
      } catch (err) {
        setError('An error occurred while loading documents');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [surveyId]);

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
        <Link
          href={`/home/editor/${surveyId}?templateId=building-survey`}
          aria-label="Generate building survey report"
        >
          <Button type="button">Generate report</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid gap-4">
        {documents.map((doc) => (
          <Link
            key={`${doc.id}-${doc.version}`}
            href={`/home/editor/${doc.id}`}
            className="group rounded-lg border p-4 transition-colors duration-200 hover:border-primary"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-medium transition-colors duration-200 group-hover:text-primary">
                    {doc.displayName}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>
                      Version {doc.version} • Updated{' '}
                      {doc.updatedAt == null
                        ? 'N/A'
                        : format(new Date(doc.updatedAt), 'dd/MM/yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 transition-colors duration-200 group-hover:text-primary" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
