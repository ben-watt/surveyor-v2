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
import {
  DEFAULT_RUNNING_PAGE_HTML,
  type MarginZone,
} from '@/app/home/components/Input/PageLayoutContext';
import { normalizeRunningHtmlForZone } from '@/app/home/components/Input/HeaderFooterEditor';
import { distributeRunningHtml } from '@/app/home/components/Input/marginZones';
import { deserializeDocument } from '../utils/documentSerialization';

const createDefaultRunningHtml = () => ({ ...DEFAULT_RUNNING_PAGE_HTML });
const normalizeRunningHtmlMap = (map: Partial<Record<MarginZone, string>>) => {
  const distributed = distributeRunningHtml(map);
  return {
    ...createDefaultRunningHtml(),
    ...distributed,
    topCenter: distributed.topCenter ?? map.topCenter ?? '',
    bottomCenter: distributed.bottomCenter ?? map.bottomCenter ?? '',
  };
};
const TOP_MARGIN_ZONES: MarginZone[] = [
  'topLeftCorner',
  'topLeft',
  'topCenter',
  'topRight',
  'topRightCorner',
];

const BOTTOM_MARGIN_ZONES: MarginZone[] = [
  'bottomLeftCorner',
  'bottomLeft',
  'bottomCenter',
  'bottomRight',
  'bottomRightCorner',
];

const LEFT_MARGIN_ZONES: MarginZone[] = ['leftTop', 'leftMiddle', 'leftBottom'];
const RIGHT_MARGIN_ZONES: MarginZone[] = ['rightTop', 'rightMiddle', 'rightBottom'];

const PREVIEW_ZONE_ORDER: MarginZone[] = [
  ...TOP_MARGIN_ZONES,
  ...LEFT_MARGIN_ZONES,
  ...RIGHT_MARGIN_ZONES,
  ...BOTTOM_MARGIN_ZONES,
];

const collectZoneHtml = (map: Record<MarginZone, string>, zones: MarginZone[]) =>
  zones.map((zone) => map[zone] ?? '').join('');

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
      runningHtml: createDefaultRunningHtml(),
      titlePage: '',
      addTitleHeaderFooter: undefined,
      getDocName: async () => surveyId,
      isLoading: false,
    };
  const editorData = document.content;
  const headerRaw = renderToStaticMarkup(<Header editorData={editorData} />);
  const footerRaw = renderToStaticMarkup(<Footer editorData={editorData} />);
  const titlePage = renderToStaticMarkup(<TitlePage editorData={editorData} />);
  const header = normalizeRunningHtmlForZone('topCenter', headerRaw);
  const footer = normalizeRunningHtmlForZone('bottomCenter', footerRaw);
  const html = await mapFormDataToHtml(editorData);
  const runningHtmlSeed: Partial<Record<MarginZone, string>> = {
    topCenter: header,
    bottomCenter: footer,
  };
  const normalizedRunningHtml = normalizeRunningHtmlMap(runningHtmlSeed);
  const runningCombined = collectZoneHtml(normalizedRunningHtml, PREVIEW_ZONE_ORDER);
  const previewContent = `${titlePage}${runningCombined}${html}`;
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
    runningHtml: normalizedRunningHtml,
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
  const [runningHtml, setRunningHtml] = React.useState<Record<MarginZone, string>>(
    createDefaultRunningHtml,
  );
  const [titlePage, setTitlePage] = React.useState<string>('');
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
            try {
              const doc = deserializeDocument(contentResult.val);
              // If the document has a templateId, use saved content but fallback to template if empty
              if (result.val.templateId) {
                const hasSavedContent =
                  doc.runningHtml &&
                  Object.values(doc.runningHtml).some((html) => html.trim() !== '');
                if (hasSavedContent) {
                  // Use saved content
                  setEditorContent(doc.body);
                  setRunningHtml(normalizeRunningHtmlMap(doc.runningHtml));
                  setTitlePage(doc.titlePage ?? '');
                  const runningCombined = collectZoneHtml(
                    normalizeRunningHtmlMap(doc.runningHtml),
                    PREVIEW_ZONE_ORDER,
                  );
                  setPreviewContent(`${doc.titlePage ?? ''}${runningCombined}${doc.body}`);
                  setHeader(doc.runningHtml.topCenter ?? '');
                  setFooter(doc.runningHtml.bottomCenter ?? '');
                  // Still get doc name from template
                  const template = await getTemplateInitialContent(
                    id,
                    result.val.templateId as TemplateId,
                  );
                  setGetDocName(() => template.getDocName);
                } else {
                  // Fallback to template generation
                  const template = await getTemplateInitialContent(
                    id,
                    result.val.templateId as TemplateId,
                  );
                  setPreviewContent(template.previewContent);
                  setHeader(template.header);
                  setFooter(template.footer);
                  setRunningHtml(normalizeRunningHtmlMap(template.runningHtml));
                  setTitlePage(template.titlePage);
                  setEditorContent(doc.body || template.editorContent);
                  setGetDocName(() => template.getDocName);
                }
              } else {
                // No templateId - use deserialized content
                setEditorContent(doc.body);
                setRunningHtml(normalizeRunningHtmlMap(doc.runningHtml));
                setTitlePage(doc.titlePage ?? '');
                const runningCombined = collectZoneHtml(
                  normalizeRunningHtmlMap(doc.runningHtml),
                  PREVIEW_ZONE_ORDER,
                );
                setPreviewContent(`${doc.titlePage ?? ''}${runningCombined}${doc.body}`);
                setHeader(doc.runningHtml.topCenter ?? '');
                setFooter(doc.runningHtml.bottomCenter ?? '');
                setGetDocName(() => async () => id);
              }
              setIsLoading(false);
            } catch (error) {
              // If deserialization fails, treat as error
              console.error('[useEditorState] Failed to deserialize document:', error);
              setIsLoading(false);
            }
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
          setRunningHtml(normalizeRunningHtmlMap(template.runningHtml));
          setTitlePage(template.titlePage);
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
          setRunningHtml(createDefaultRunningHtml());
          setTitlePage('');
          setGetDocName(() => async () => id);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, templateId, enabled]);

  const addTitleHeaderFooter = React.useCallback(
    ({ editor }: { editor: Editor }) => {
      const currentEditorHtml = editor.getHTML();
      setEditorContent(currentEditorHtml);
      const runningCombined = collectZoneHtml(runningHtml, PREVIEW_ZONE_ORDER);
      const combined = `${titlePage ?? ''}${runningCombined}${currentEditorHtml}`;
      setPreviewContent(combined);
    },
    [runningHtml, titlePage],
  );

  const setRunningZoneHtml = React.useCallback((zone: MarginZone, value: string) => {
    setRunningHtml((prev) => ({ ...prev, [zone]: value }));
    if (zone === 'topCenter') {
      setHeader(value);
    } else if (zone === 'bottomCenter') {
      setFooter(value);
    }
  }, []);

  const setHeaderHtml = React.useCallback(
    (value: string) => {
      setRunningZoneHtml('topCenter', value);
    },
    [setRunningZoneHtml],
  );

  const setFooterHtml = React.useCallback(
    (value: string) => {
      setRunningZoneHtml('bottomCenter', value);
    },
    [setRunningZoneHtml],
  );

  return {
    editorContent,
    previewContent,
    header,
    footer,
    runningHtml,
    titlePage,
    setPreviewContent,
    addTitleHeaderFooter,
    setHeader: setHeaderHtml,
    setFooter: setFooterHtml,
    setRunningHtml: setRunningZoneHtml,
    getDocName,
    isLoading,
  };
}
