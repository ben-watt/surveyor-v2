/* eslint-disable @next/next/no-img-element */
"use client";

import { NewEditor } from "@/app/app/components/Input/BlockEditor";
import { Previewer } from "pagedjs";
import React from "react";
import { BuildingSurveyFormData } from "@/app/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import BuildingSurveyReport from "@/app/app/surveys/building-survey-reports/BuildingSurveyReportTipTap";
import { renderToStaticMarkup } from "react-dom/server";
import { getUrl } from "aws-amplify/storage";
import { surveyStore } from "@/app/app/clients/Database";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Custom hook for managing editor state
const useEditorState = (surveyId: string) => {
  const [editorContent, setEditorContent] = React.useState<string>("");
  const [editorData, setEditorData] = React.useState<BuildingSurveyFormData>();
  const [previewContent, setPreviewContent] = React.useState<string>("");
  const [headerFooterHtml, setHeaderFooterHtml] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const getReport = async () => {
      try {
        setIsLoading(true);
        const survey = await surveyStore.get(surveyId);
        setEditorData(survey.content);
      } catch (error) {
        console.error("Failed to fetch survey:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getReport();
  }, [surveyId]);

  const renderHeaderFooter = React.useCallback(
    () => renderToStaticMarkup(<HeaderFooterHtml editorData={editorData} />),
    [editorData]
  );

  const mapToEditorContent = React.useCallback(async () => {
    try {
      const html = await mapFormDataToHtml(editorData);
      setEditorContent(html);
    } catch (error) {
      console.error("Failed to map form data to HTML:", error);
    }
  }, [editorData]);

  React.useEffect(() => {
    mapToEditorContent();
  }, [mapToEditorContent]);

  React.useEffect(() => {
    setHeaderFooterHtml(renderHeaderFooter());
  }, [renderHeaderFooter]);

  return {
    editorContent,
    previewContent,
    headerFooterHtml,
    setPreviewContent,
  };
};

// Utility function for image loading
async function getImagesHref(imagesUri: string[]): Promise<string[]> {
  if (!imagesUri?.length) return [];

  try {
    const tasks = imagesUri.map(getImageHref);
    return await Promise.all(tasks);
  } catch (error) {
    console.error("Failed to get image hrefs:", error);
    return [];
  }
}

async function getImageHref(imageUri: string): Promise<string> {
  try {
    const path = await getUrl({ path: imageUri });
    return path.url.href;
  } catch (error) {
    console.error(`Failed to get image href for ${imageUri}:`, error);
    return "";
  }
}

// Preview component
const PrintPreviewer = ({ content, onBack }: { content: string; onBack: () => void }) => {
  const previewRef = React.useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [previewer, setPreviewer] = React.useState<Previewer>();
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      // Create a temporary container that's hidden but properly rendered
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.width = '210mm';  // A4 width
      container.style.height = '297mm';  // A4 height
      container.style.visibility = 'hidden';
      container.style.zIndex = '-1000';
      document.body.appendChild(container);

      // Add necessary styles
      const styleLinks = [
        '/pagedstyles.css',
        '/interface.css'
      ].map(href => `<link rel="stylesheet" type="text/css" href="${href}">`).join('');
      
      // Create the content HTML
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            ${styleLinks}
            <style>
              @media print {
                body { margin: 0; }
                .pagedjs_page { margin: 0; }
              }
            </style>
          </head>
          <body class="tiptap">
            ${content}
          </body>
        </html>
      `;

      // Initialize a new previewer for PDF generation
      const pdfPreviewer = new Previewer({
        // Default configuration for PDF generation
        enableHeaderFooter: true,
        enablePageNumbers: true
      });
      
      // Wait for the preview to be generated
      await pdfPreviewer.preview(html, ["/pagedstyles.css", "/interface.css"], container);
      
      // Small delay to ensure everything is rendered
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Print settings for PDF
      const printSettings = {
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        pageSize: 'A4',
        printBackground: true
      };

      // Open print dialog
      window.print();
      
      // Cleanup
      document.body.removeChild(container);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSave = async () => {
    // TODO: Implement save functionality
    console.log('Save functionality to be implemented');
  };

  React.useEffect(() => {
    async function init() {
      try {
        if (!previewer) {
          console.debug('Creating new Previewer instance');
          setPreviewer(new Previewer({
            // Reduce chunk size to prevent timeouts
            chunker: {
              maxChunks: 20,
              maxLength: 5000
            }
          }));
          return;
        }

        if (previewRef.current) {
          console.debug('Starting preview generation');
          previewRef.current.replaceChildren();
          
          // Add global error handler to catch any Paged.js errors
          const errorHandler = (event: ErrorEvent) => {
            console.error('Global error caught:', {
              message: event.message,
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno,
              error: event.error
            });
          };
          window.addEventListener('error', errorHandler);
          
          let structuredHtml = '';
          
          try {
            console.debug('Preview content length:', content.length);
            
            // Create properly structured HTML
            const styleLinks = [
              '/pagedstyles.css',
              '/interface.css'
            ].map(href => `<link rel="stylesheet" type="text/css" href="${href}">`).join('');
            
            structuredHtml = `
              <!DOCTYPE html>
              <html>
                <head>
                  ${styleLinks}
                  <style>
                    @media print {
                      body { margin: 0; }
                      .pagedjs_page { margin: 0; }
                    }
                  </style>
                </head>
                <body class="tiptap">
                  ${content}
                </body>
              </html>
            `;
            
            console.debug('Starting preview with styles:', ["/pagedstyles.css", "/interface.css"]);
            
            // Break down the preview process
            console.debug('Step 1: Creating preview instance');
            const previewInstance = previewer.preview(
              structuredHtml,
              ["/pagedstyles.css", "/interface.css"],
              previewRef.current
            );
            
            console.debug('Step 2: Waiting for preview completion');
            const flow = await Promise.race([
              previewInstance,
              // Add a timeout to catch hanging preview calls
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Preview generation timed out after 60s')), 60000)
              )
            ]) as { pages: any[] };

            console.debug("Preview rendered pages:", flow.pages);
            setIsInitialized(true);
          } catch (previewError: unknown) {
            const error = previewError as Error;
            console.error("Failed to initialize preview:", {
              error: error,
              errorName: error.name,
              errorMessage: error.message,
              errorStack: error.stack
            });
            
            // Log the structured HTML for debugging
            console.debug('Content preview:', {
              structuredHtml: structuredHtml?.slice(0, 500),
              contentLength: structuredHtml?.length,
              hasBody: structuredHtml?.includes('<body'),
              hasStyles: structuredHtml?.includes('pagedstyles.css'),
              previewRefExists: !!previewRef.current,
              previewerExists: !!previewer
            });

            throw error;
          } finally {
            // Clean up error handler
            window.removeEventListener('error', errorHandler);
          }
        }
      } catch (error: unknown) {
        const err = error as Error;
        console.error("Failed to initialize preview (outer):", {
          error: err,
          errorName: err.name,
          errorMessage: err.message,
          errorStack: err.stack
        });
      }
    }

    init();
  }, [content, previewer]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Editor
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleDownload}
            disabled={isDownloading}
          >
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? 'Generating PDF...' : 'Download PDF'}
          </Button>
        </div>
      </div>
      
      {!isInitialized && (
        <div className="p-8 space-y-4">
          <div className="flex items-center justify-center">
            <div className="space-y-4 w-full max-w-2xl">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="space-y-2">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="pagedjs_print_preview tiptap">
        <div ref={previewRef} />
      </div>
    </div>
  );
};

// Header/Footer component
const HeaderFooterHtml = ({ editorData }: { editorData: BuildingSurveyFormData | undefined }) => (
  <>
    <img
      className="headerImage"
      src="/cwbc-logo.webp"
      alt="CWBC Logo"
      width="600"
      height="400"
    />
    <div className="headerAddress">
      <p>{editorData ? editorData.reportDetails.address.formatted : "Unknown"}</p>
    </div>
    <img
      className="footerImage"
      src="/rics-purple-logo.jpg"
      alt="RICS Logo"
      width="600"
      height="400"
    />
  </>
);

async function mapFormDataToHtml(
  formData: BuildingSurveyFormData | undefined
): Promise<string> {
  if (!formData) return "";

  try {
    const newFormData = { ...formData };

    const [frontElevationImages, moneyShot, signaturePath] = await Promise.all([
      getImagesHref(formData.reportDetails.frontElevationImagesUri ?? []),
      getImagesHref(formData.reportDetails.moneyShot ?? []),
      getImagesHref(formData.owner.signaturePath ?? []),
    ]);

    newFormData.reportDetails.frontElevationImagesUri = frontElevationImages;
    newFormData.reportDetails.moneyShot = moneyShot;
    newFormData.owner.signaturePath = signaturePath;

    const sectionImageTasks = formData.sections.map(async (section, si) => {
      const elementSectionTasks = section.elementSections.map(async (es, i) => {
        const preSignedUrl = await getImagesHref(es.images ?? []);
        newFormData.sections[si].elementSections[i].images = preSignedUrl;
      });
      await Promise.all(elementSectionTasks);
    });

    await Promise.all(sectionImageTasks);

    return renderToStaticMarkup(<BuildingSurveyReport form={newFormData} />);
  } catch (error) {
    console.error("Failed to map form data to HTML:", error);
    return "";
  }
}

// Main page component
export default function Page({ params }: { params: { id: string } }) {
  const [preview, setPreview] = React.useState(false);
  const { editorContent, previewContent, headerFooterHtml, setPreviewContent } = useEditorState(params.id);

  const handleEditorUpdate = (html: string) => {
    setPreviewContent(headerFooterHtml + html);
  };

  return (
    <div>
      <div className="w-[962px] m-auto">
        {editorContent && !preview && (
          <NewEditor
            content={editorContent}
            onCreate={(e) => handleEditorUpdate(e.editor.getHTML())}
            onUpdate={(e) => handleEditorUpdate(e.editor.getHTML())}
            onPrint={() => setPreview(true)}
          />
        )}
      </div>
      {preview && (
        <PrintPreviewer 
          content={previewContent} 
          onBack={() => setPreview(false)}
        />
      )}
    </div>
  );
}
