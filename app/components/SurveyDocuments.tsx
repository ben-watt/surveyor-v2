import React, { useEffect, useState } from 'react';
import { FileText, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { DynamoDocument } from '@/app/home/clients/DocumentStore';
import { documentStore } from '@/app/home/clients/DocumentStore';
import { format } from 'date-fns';

interface SurveyDocumentsProps {
  surveyId: string;
  className?: string;
}

export const SurveyDocuments: React.FC<SurveyDocumentsProps> = ({ surveyId, className }) => {
  const [documents, setDocuments] = useState<DynamoDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setIsLoading(true);
        const result = await documentStore.list();
        if (result.ok) {
          // Sort by version, showing latest first
          result.val.sort((a, b) => b.version - a.version);
          setDocuments(result.val);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" role="status">
          <span className="sr-only">Loading documents...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 text-center">
        {error}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-gray-500 p-4 text-center">
        No reports found for this survey
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
            className="group p-4 border rounded-lg hover:border-primary transition-colors duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-medium group-hover:text-primary transition-colors duration-200">
                    {doc.displayName}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      Version {doc.version} • Updated {format(new Date(doc.updatedAt), 'MM/dd/yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors duration-200" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}; 