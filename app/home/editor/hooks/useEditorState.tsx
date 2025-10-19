import React from 'react';
import {
  BuildingSurveyFormData,
  formatAddress,
} from '@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema';
import { surveyStore } from '@/app/home/clients/Database';
import { mapFormDataToHtml } from '../utils/formData';
import { Footer, Header, TitlePage } from '../components/HeaderFooter';
import { renderToStaticMarkup } from 'react-dom/server';
import { Editor } from '@tiptap/react';
import { documentStore } from '../../clients/DocumentStore';

type TemplateId = 'building-survey';

export const useDocumentTemplate = (surveyId: string, templateId: TemplateId) => {
  const [editorContent, setEditorContent] = React.useState<string>('');
  const [editorData, setEditorData] = React.useState<BuildingSurveyFormData>();
  const [previewContent, setPreviewContent] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [header, setHeader] = React.useState<string>('');
  const [footer, setFooter] = React.useState<string>('');
  const [titlePage, setTitlePage] = React.useState<string>('');

  if (templateId !== 'building-survey') {
    throw new Error('Invalid template id');
  }

  // Load initial data
  React.useEffect(() => {
    const getReport = async () => {
      try {
        setIsLoading(true);
        const document = await surveyStore.get(surveyId);
        if (document) {
          setEditorData(document.content);
        }
      } catch (error) {
        console.error('Failed to fetch survey:', error);
        setIsLoading(false);
      }
    };

    getReport();
  }, [surveyId]);

  // Render header, footer, and title page when editorData changes
  React.useEffect(() => {
    if (editorData) {
      const newHeader = renderToStaticMarkup(<Header editorData={editorData} />);
      const newFooter = renderToStaticMarkup(<Footer editorData={editorData} />);
      const newTitlePage = renderToStaticMarkup(<TitlePage editorData={editorData} />);

      setHeader(newHeader);
      setFooter(newFooter);
      setTitlePage(newTitlePage);
    }
  }, [editorData]);

  // Map form data to HTML when editorData changes
  React.useEffect(() => {
    const updateContent = async () => {
      if (editorData && header && footer && titlePage) {
        try {
          const html = await mapFormDataToHtml(editorData);
          setEditorContent(html);
          setPreviewContent(titlePage + header + html + footer);
          setIsLoading(false);
        } catch (error) {
          console.error('[useEditorState] Failed to map form data to HTML', error);
          setIsLoading(false);
        }
      }
    };

    updateContent();
  }, [editorData, header, footer, titlePage]);

  const addTitleHeaderFooter = React.useCallback(
    ({ editor }: { editor: Editor }) => {
      const currentEditorHtml = editor.getHTML();
      setEditorContent(currentEditorHtml);
      setPreviewContent(titlePage + header + currentEditorHtml + footer);
    },
    [titlePage, header, footer],
  );

  const getDocName = async () => {
    const document = await surveyStore.get(surveyId);
    if (document) {
      return formatAddress(document.content.reportDetails.address);
    }
    return surveyId;
  };

  return {
    editorContent,
    previewContent,
    header,
    footer,
    titlePage,
    setPreviewContent,
    addTitleHeaderFooter,
    getDocName,
    isLoading,
  };
};

// Helper to get template initial content (not a hook)
async function getTemplateInitialContent(surveyId: string, templateId: TemplateId) {
  if (templateId !== 'building-survey') throw new Error('Invalid template id');
  const document = await surveyStore.get(surveyId);
  if (!document)
    return {
      editorContent: '',
      previewContent: '',
      header: '',
      footer: '',
      titlePage: '',
      addTitleHeaderFooter: undefined,
      getDocName: async () => surveyId,
      isLoading: false,
    };
  const editorData = document.content;
  const header = renderToStaticMarkup(<Header editorData={editorData} />);
  const footer = renderToStaticMarkup(<Footer editorData={editorData} />);
  const titlePage = renderToStaticMarkup(<TitlePage editorData={editorData} />);
  const html = await mapFormDataToHtml(editorData);
  const previewContent = titlePage + header + html + footer;
  const addTitleHeaderFooter = ({ editor }: { editor: Editor }) => {
    const currentEditorHtml = editor.getHTML();
    // This is a helper, so state update should be handled in the hook
    // If you need to update preview, do it in the hook's callback
  };
  const getDocName = async () => formatAddress(document.content.reportDetails.address);
  return {
    editorContent: html,
    previewContent,
    header,
    footer,
    titlePage,
    addTitleHeaderFooter,
    getDocName,
    isLoading: false,
  };
}

export function useEditorState(
  id: string,
  templateId?: string,
  options?: {
    enabled?: boolean;
  },
) {
  const [editorContent, setEditorContent] = React.useState<string>('');
  const [previewContent, setPreviewContent] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [header, setHeader] = React.useState<string>('');
  const [footer, setFooter] = React.useState<string>('');
  const [titlePage, setTitlePage] = React.useState<string>('');
  const [addTitleHeaderFooter, setAddTitleHeaderFooter] = React.useState<any>(null);
  const [getDocName, setGetDocName] = React.useState<any>(() => async () => id);
  const enabled = options?.enabled ?? true;

  React.useEffect(() => {
    if (!enabled) {
      setIsLoading(true);
      return;
    }
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      // Try to load existing document
      const result = await documentStore.get(id);
      if (result && result.ok) {
        const contentResult = await documentStore.getContent(id);
        if (contentResult.ok) {
          if (!cancelled) {
            setEditorContent(contentResult.val);
            // If the document has a templateId, use the template logic
            if (result.val.templateId) {
              const template = await getTemplateInitialContent(
                id,
                result.val.templateId as TemplateId,
              );
              setPreviewContent(template.previewContent);
              setHeader(template.header);
              setFooter(template.footer);
              setTitlePage(template.titlePage);
              setAddTitleHeaderFooter(() => ({ editor }: { editor: Editor }) => {
                const currentEditorHtml = editor.getHTML();
                setEditorContent(currentEditorHtml);
                setPreviewContent(
                  template.titlePage + template.header + currentEditorHtml + template.footer,
                );
              });
              setGetDocName(() => template.getDocName);
            } else {
              setPreviewContent(contentResult.val);
              setHeader('');
              setFooter('');
              setTitlePage('');
              setAddTitleHeaderFooter(() => ({ editor }: { editor: Editor }) => {
                const html = editor.getHTML();
                setEditorContent(html);
                setPreviewContent(html);
              });
              setGetDocName(() => async () => id);
            }
            setIsLoading(false);
          }
          return;
        }
      }
      // If not found and templateId is provided, use template logic
      if (templateId) {
        const template = await getTemplateInitialContent(id, templateId as TemplateId);
        if (!cancelled) {
          setEditorContent(template.editorContent);
          setPreviewContent(template.previewContent);
          setIsLoading(template.isLoading);
          setHeader(template.header);
          setFooter(template.footer);
          setTitlePage(template.titlePage);
          setAddTitleHeaderFooter(() => ({ editor }: { editor: Editor }) => {
            const currentEditorHtml = editor.getHTML();
            setEditorContent(currentEditorHtml);
            setPreviewContent(
              template.titlePage + template.header + currentEditorHtml + template.footer,
            );
          });
          setGetDocName(() => template.getDocName);
        }
      } else {
        // Blank new document
        if (!cancelled) {
          setEditorContent('');
          setPreviewContent('');
          setIsLoading(false);
          setHeader('');
          setFooter('');
          setTitlePage('');
          setAddTitleHeaderFooter(() => ({ editor }: { editor: Editor }) => {
            const html = editor.getHTML();
            setEditorContent(html);
            setPreviewContent(html);
          });
          setGetDocName(() => async () => id);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, templateId, enabled]);

  return {
    editorContent,
    previewContent,
    header,
    footer,
    titlePage,
    setPreviewContent,
    addTitleHeaderFooter,
    getDocName,
    isLoading,
  };
}
