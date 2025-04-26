import React, { useEffect } from "react";
import { Previewer } from "pagedjs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";

interface PrintPreviewerProps {
  content: string;
  onBack: () => void;
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
        console.log("[PrintPreviewer] Starting preview generation");
        if (!prev.isConnected) return;
        
        // Clear previous content
        prev.innerHTML = '';
        setIsRendering(true);
        
        // Create new previewer instance for each update
        currentPreviewer = new Previewer({});
        await currentPreviewer.preview(
          content,
          ["/pagedstyles.css", "/interface.css"],
          prev
        );
        
        console.log("[PrintPreviewer] Preview generation complete");
        setIsRendering(false);
      } catch (error) {
        console.error("[PrintPreviewer] Preview generation failed:", error);
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
  }, [content]);  // Re-run when content changes

  return (
    <div className="absolute inset-0 bg-white">
      <div className="flex items-center justify-between p-4 border-b print:!hidden">
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
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-[9999]">
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