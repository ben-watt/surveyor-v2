'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImageIcon, Plus } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

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
  surveyId,
}: CompactPhotoGridProps) {
  const router = useRouter();

  if (previewPhotos.length === 0) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Photos</span>
              <Badge variant="outline">0</Badge>
            </div>
          </div>

          <div className="rounded-lg border-2 border-dashed border-muted p-6 text-center">
            <ImageIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="mb-3 text-sm text-muted-foreground">No photos yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            <span className="font-medium">Photos</span>
            <Badge variant="outline">{totalPhotos}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push(galleryUrl)}>
            View All
          </Button>
        </div>

        <div
          className="grid cursor-pointer grid-cols-2 gap-1 overflow-hidden rounded-lg"
          onClick={() => router.push(galleryUrl)}
        >
          {previewPhotos.slice(0, 4).map((photo, index) => (
            <div key={index} className="group relative aspect-square">
              <Image
                src={photo}
                alt={`Survey photo ${index + 1}`}
                fill
                className="object-cover transition-opacity group-hover:opacity-80"
              />
              {index === 3 && totalPhotos > 4 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <span className="text-sm font-medium text-white">+{totalPhotos - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
