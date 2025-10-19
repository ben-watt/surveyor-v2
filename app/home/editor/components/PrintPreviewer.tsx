import React, { useEffect } from 'react';
import { Previewer } from 'pagedjs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import { getImageHref } from '../utils/image';

interface PrintPreviewerProps {
  content: string;
  onBack: () => void;
}

type PreparedContent = {
  html: string;
  failedPaths: string[];
};

async function prepareContentWithResolvedImages(content: string): Promise<PreparedContent> {
  try {
    const parser = new DOMParser();
    const parsedDocument = parser.parseFromString(content, 'text/html');
    const images = Array.from(parsedDocument.querySelectorAll('img[data-s3-path]'));
    const failedPaths: string[] = [];

    await Promise.all(
      images.map(async (img) => {
        const s3Path = img.getAttribute('data-s3-path');
        if (!s3Path) return;

        try {
          const url = await getImageHref(s3Path);
          if (url) {
            img.setAttribute('src', url);
          } else {
            failedPaths.push(s3Path);
            img.setAttribute('data-image-error', 'true');
            img.setAttribute('alt', img.getAttribute('alt') || 'Image unavailable');
          }
        } catch (error) {
          failedPaths.push(s3Path);
          img.setAttribute('data-image-error', 'true');
          img.setAttribute('alt', img.getAttribute('alt') || 'Image unavailable');
        }
      }),
    );

    const hasHtmlRoot =
      /<html[\s>]/i.test(content) || /^<!doctype\s+html>/i.test(content.trim());
    const serializedHtml = hasHtmlRoot
      ? parsedDocument.documentElement.outerHTML
      : parsedDocument.body?.innerHTML || content;

    // Serialize updated markup; prefer body children to avoid wrapping html/head tags.
    return {
      html: serializedHtml,
      failedPaths,
    };
  } catch (error) {
    console.error('[PrintPreviewer] Failed to prepare content HTML:', error);
    return {
      html: content,
      failedPaths: [],
    };
  }
}

async function waitForImages(container: HTMLElement | Document) {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise((resolve) => {
          const image = img as HTMLImageElement;
          if (image.complete) {
            resolve(null);
            return;
          }

          const handleResolve = () => {
            image.removeEventListener('load', handleResolve);
            image.removeEventListener('error', handleResolve);
            resolve(null);
          };

          image.addEventListener('load', handleResolve, { once: true });
          image.addEventListener('error', handleResolve, { once: true });
        }),
    ),
  );
}

export const PrintPreviewer: React.FC<PrintPreviewerProps> = ({ content, onBack }) => {
  const previewRef = React.useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isRendering, setIsRendering] = React.useState(true);

  const handleDownload = () => {
    setIsDownloading(true);
    window.print();
    setIsDownloading(false);
  };

  useEffect(() => {
    if (!previewRef.current || !content) return;

    const prev = previewRef.current;
    let timeoutId: NodeJS.Timeout;
    let currentPreviewer: Previewer | null = null;

    const generatePreview = async () => {
      try {
        console.log('[PrintPreviewer] Starting preview generation');
        if (!prev.isConnected) return;

        // Clear previous content
        prev.innerHTML = '';
        setIsRendering(true);

        const { html: preparedHtml, failedPaths } = await prepareContentWithResolvedImages(content);
        if (failedPaths.length) {
          console.warn('[PrintPreviewer] Failed to resolve image paths:', failedPaths);
        }

        // Create new previewer instance for each update
        currentPreviewer = new Previewer({});
        await currentPreviewer.preview(preparedHtml, ['/pagedstyles.css', '/interface.css'], prev);

        // Ensure images finish loading before allowing print
        await waitForImages(prev);

        console.log('[PrintPreviewer] Preview generation complete');
        setIsRendering(false);
      } catch (error) {
        console.error('[PrintPreviewer] Preview generation failed:', error);
        setIsRendering(false);
      }
    };

    // Debounce the preview generation
    // Solves the issue of multiple preview generations in dev
    timeoutId = setTimeout(generatePreview, 100);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (currentPreviewer) {
        currentPreviewer = null;
      }
      if (prev.isConnected) {
        prev.innerHTML = '';
      }
    };
  }, [content]); // Re-run when content changes

  return (
    <div className="absolute inset-0 bg-white">
      <div className="flex items-center justify-between border-b p-4 print:!hidden">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Editor
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleDownload}
          disabled={isDownloading || isRendering}
        >
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? 'Printing...' : 'Print'}
        </Button>
      </div>

      <div className="relative">
        {isRendering && (
          <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-background/50">
            <div className="text-muted-foreground">Generating preview...</div>
          </div>
        )}
        <div className="pagedjs_print_preview tiptap">
          <div ref={previewRef} />
        </div>
      </div>
    </div>
  );
};
