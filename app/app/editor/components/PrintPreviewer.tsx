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

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @page { size: A4; margin: 2cm; }
            body { margin: 0; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `;

    var previewer = new Previewer({});
    previewer.preview(content, ["/pagedstyles.css", "/interface.css"], prev)

    return () => {  
      if (prev.isConnected) {
        prev.innerHTML = '';
      }
    };
  }, [content]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Editor
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          onClick={handleDownload}
          disabled={isDownloading}
        >
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? 'Printing...' : 'Print'}
        </Button>
      </div>
      
      <div className="pagedjs_print_preview">
        <div ref={previewRef} />
      </div>
    </div>
  );
}; 