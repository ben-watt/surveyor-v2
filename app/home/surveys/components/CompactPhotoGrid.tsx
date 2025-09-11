"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon, Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface CompactPhotoGridProps {
  previewPhotos: string[];
  totalPhotos: number;
  galleryUrl: string;
  surveyId: string;
}

export function CompactPhotoGrid({ 
  previewPhotos, 
  totalPhotos, 
  galleryUrl,
  surveyId 
}: CompactPhotoGridProps) {
  const router = useRouter();

  if (previewPhotos.length === 0) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">Photos</span>
              <Badge variant="outline">0</Badge>
            </div>
          </div>
          
          <div className="text-center p-6 border-2 border-dashed border-muted rounded-lg">
            <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No photos yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            <span className="font-medium">Photos</span>
            <Badge variant="outline">{totalPhotos}</Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push(galleryUrl)}
          >
            View All
          </Button>
        </div>
        
        <div 
          className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden cursor-pointer"
          onClick={() => router.push(galleryUrl)}
        >
          {previewPhotos.slice(0, 4).map((photo, index) => (
            <div key={index} className="relative aspect-square group">
              <Image 
                src={photo} 
                alt={`Survey photo ${index + 1}`} 
                fill 
                className="object-cover group-hover:opacity-80 transition-opacity" 
              />
              {index === 3 && totalPhotos > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    +{totalPhotos - 4}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}