import React from "react";
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

  console.log("[PrintPreviewer] Rendering", content);

  const handleDownload = () => {
    setIsDownloading(true);
    window.print();
    setIsDownloading(false);
  };

  React.useEffect(() => {
    if (!previewRef.current) return;
    const prev = previewRef.current;
    prev.innerHTML = '';
    setIsRendering(true);

    var previewer = new Previewer({});
    previewer
      .preview(content, ["/pagedstyles.css", "/interface.css"], prev)
      .then(() => {
        setIsRendering(false);
      })
      .catch((error) => {
        console.error("Preview generation failed:", error);
        setIsRendering(false);
      });

    return () => {  
      if (prev.isConnected) {
        prev.innerHTML = '';
      }
    };
  }, [content]);

  return (
    <div>
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