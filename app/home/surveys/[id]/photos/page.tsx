'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { surveyStore, elementStore, sectionStore } from '@/app/home/clients/Database';
import { enhancedImageStore } from '@/app/home/clients/enhancedImageMetadataStore';
import { ArrowLeft, Archive, ImageOff, Loader2, Download } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ImageViewerModal } from '@/app/home/components/ImageViewerModal';
import { findComponent } from '@/app/home/surveys/building-survey-reports/Survey';
import { Skeleton } from '@/components/ui/skeleton';

interface PhotoSection {
  name: string;
  photos: { id: string; url: string; isArchived: boolean; imagePath: string; fileName?: string }[];
}

function PhotoGallery() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [isHydrated, survey] = surveyStore.useGet(id);
  const [elementsHydrated, elements] = elementStore.useList();
  const [sectionsHydrated, sections] = sectionStore.useList();
  const [photoSections, setPhotoSections] = useState<PhotoSection[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSection, setSelectedSection] = useState<PhotoSection | null>(null);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();

  // Ensure survey match by path segment, not substring
  const isImageForSurvey = (imagePath: string, surveyId: string): boolean => {
    if (!imagePath || !surveyId) return false;
    const normalized = imagePath.replace(/^\/+|\/+$/g, '');
    const segments = normalized.split('/').filter(Boolean);

    const idxReport = segments.indexOf('report-images');
    if (idxReport !== -1) {
      return segments[idxReport + 1] === surveyId;
    }

    const idxSurveys = segments.indexOf('surveys');
    if (idxSurveys !== -1) {
      return segments[idxSurveys + 1] === surveyId;
    }

    return false;
  };

  // Build quick lookup maps
  const elementById = useMemo(() => {
    const map = new Map<string, { id: string; name: string; sectionId: string }>();
    for (const e of elements) {
      map.set(e.id, { id: e.id, name: e.name, sectionId: e.sectionId });
    }
    return map;
  }, [elements]);

  const sectionNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sections) {
      map.set(s.id, s.name);
    }
    return map;
  }, [sections]);

  type ParsedPath =
    | { kind: 'cover' }
    | { kind: 'front' }
    | { kind: 'report' }
    | { kind: 'element'; elementId: string }
    | { kind: 'inspection'; inspectionId: string };

  const parseImagePath = (imagePath: string): ParsedPath | null => {
    const p = String(imagePath || '');
    const normalized = p.replace(/^\/+|\/+$/g, '');
    const segments = normalized.split('/').filter(Boolean);

    // Special buckets
    if (p.includes('/money-shot/') || p.includes('moneyShot')) return { kind: 'cover' };
    if (p.includes('/front-elevation/') || p.includes('frontElevation')) return { kind: 'front' };

    const idxReport = segments.indexOf('report-images');
    if (idxReport === -1) return null;

    // report-images/<surveyId>/...
    const afterSurvey = segments.slice(idxReport + 2); // skip 'report-images' and surveyId
    if (afterSurvey.length === 0) return { kind: 'report' };

    const [folder, idOrNext] = afterSurvey;
    if (folder === 'elements' && idOrNext) return { kind: 'element', elementId: idOrNext };
    if (folder === 'inspections' && idOrNext) return { kind: 'inspection', inspectionId: idOrNext };
    return { kind: 'report' };
  };

  const resolveDisplayName = (imagePath: string): string => {
    const parsed = parseImagePath(imagePath);
    if (!parsed) return 'Report Images';

    if (parsed.kind === 'cover') return 'Cover Image';
    if (parsed.kind === 'front') return 'Front Elevation';
    if (parsed.kind === 'report') return 'Report Images';

    if (parsed.kind === 'element') {
      const el = elementById.get(parsed.elementId);
      const elementName = el?.name || 'Unknown Element';
      const sectionName = (el?.sectionId && sectionNameById.get(el.sectionId)) || 'Unknown Section';
      return `${sectionName} / ${elementName}`;
    }

    if (parsed.kind === 'inspection') {
      if (!survey) return 'Inspections';
      const ctx = findComponent(survey, parsed.inspectionId);
      const elementId = ctx.elementSection?.id;
      const el = elementId ? elementById.get(elementId) : undefined;
      const elementName = el?.name || ctx.elementSection?.name || 'Unknown Element';
      const sectionName =
        (el?.sectionId && sectionNameById.get(el.sectionId)) ||
        ctx.section?.name ||
        'Unknown Section';
      return `Inspections / ${sectionName} / ${elementName}`;
    }

    return 'Report Images';
  };

  const loadPhotos = async () => {
    if (!survey) return;

    try {
      setIsLoadingPhotos(true);
      // Get both active and archived images from enhanced store only
      const [activeResult, archivedResult] = await Promise.all([
        enhancedImageStore.getActiveImages(),
        enhancedImageStore.getArchivedImages(),
      ]);

      let allImages: any[] = [];
      if (activeResult.ok) {
        allImages.push(...activeResult.val);
      }
      if (archivedResult.ok) {
        allImages.push(...archivedResult.val);
      }

      console.log('[PhotoGallery] Enhanced store images:', allImages);

      // Filter images for this survey using path segment checks
      const surveyImages = allImages.filter((img) =>
        isImageForSurvey(String(img.imagePath || ''), id),
      );

      console.log('[PhotoGallery] Filtered survey images:', surveyImages);

      // Group images by resolved display name
      const sections: PhotoSection[] = [];
      const groupedImages = new Map<string, typeof surveyImages>();

      surveyImages.forEach((img) => {
        const sectionName = resolveDisplayName(String(img.imagePath || ''));

        if (!groupedImages.has(sectionName)) {
          groupedImages.set(sectionName, []);
        }

        // Convert enhanced store format to PhotoSection format
        groupedImages.get(sectionName)?.push({
          id: img.id,
          url: img.thumbnailDataUrl || '', // Use thumbnail for grid display
          isArchived: img.isArchived || false,
          imagePath: img.imagePath,
          fileName: img.fileName,
        });
      });

      // Convert grouped images to sections
      groupedImages.forEach((photos, name) => {
        if (photos.length > 0) {
          sections.push({ name, photos });
        }
      });

      console.log('[PhotoGallery] Organized sections:', sections);
      setPhotoSections(sections);
    } catch (error) {
      console.error('[PhotoGallery] Error loading photos:', error);
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  // Handle image click to open modal
  const handleImageClick = (sectionIndex: number, imageIndex: number) => {
    const section = photoSections[sectionIndex];
    const filteredPhotos = showArchived
      ? section.photos
      : section.photos.filter((photo) => !photo.isArchived);

    if (filteredPhotos.length > 0) {
      setSelectedSection({ ...section, photos: filteredPhotos });
      setSelectedImageIndex(imageIndex);
      setIsModalOpen(true);
    }
  };

  useEffect(() => {
    if (isHydrated && elementsHydrated && sectionsHydrated && survey) {
      loadPhotos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, elementsHydrated, sectionsHydrated, survey]);

  const totalPhotos = photoSections.reduce((total, section) => total + section.photos.length, 0);
  const activeTotal = photoSections.reduce(
    (total, section) => total + section.photos.filter((p) => !p.isArchived).length,
    0,
  );
  const archivedTotal = photoSections.reduce(
    (total, section) => total + section.photos.filter((p) => p.isArchived).length,
    0,
  );
  const visibleTotal = showArchived ? activeTotal + archivedTotal : activeTotal;

  const isValidImageSrc = (url?: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    // Accept data URLs, http(s), and absolute/next public paths
    return (
      url.startsWith('data:') ||
      url.startsWith('http') ||
      url.startsWith('/') ||
      url.startsWith('blob:')
    );
  };

  const showSkeleton =
    !isHydrated ||
    !elementsHydrated ||
    !sectionsHydrated ||
    (isLoadingPhotos && photoSections.length === 0);

  if (showSkeleton) {
    return (
      <div className="container mx-auto p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Skeleton className="mb-2 h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>

        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="mb-2 h-5 w-56" />
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 10 }).map((__, j) => (
                  <Skeleton key={j} className="aspect-square w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleExportZip = async () => {
    try {
      setIsExporting(true);
      // Build items array with server-friendly fields
      const rawItems = photoSections.flatMap((section) =>
        section.photos.map((p) => ({
          imagePath: p.imagePath,
          fileName: p.fileName,
          isArchived: !!p.isArchived,
          destFolder: section.name,
          // Provide dataUrl fallback (thumbnail) only if we cannot obtain full URL
          dataUrl: isValidImageSrc(p.url) && p.url.startsWith('data:') ? p.url : undefined,
        })),
      );

      // Resolve full URLs on client to ensure full-resolution export
      const items = await Promise.all(
        rawItems.map(async (it) => {
          try {
            const urlRes = await enhancedImageStore.getFullImageUrl(it.imagePath);
            if (urlRes.ok) {
              return { ...it, fullUrl: urlRes.val };
            }
          } catch (_) {}
          return it;
        }),
      );

      const res = await fetch(
        `/api/surveys/${encodeURIComponent(id)}/photos/export?includeArchived=${showArchived ? 'true' : 'false'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        },
      );

      if (!res.ok) {
        console.error('[PhotoGallery] Export failed:', await res.text());
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `survey-${id}-photos.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[PhotoGallery] Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl dark:text-white">Photo Gallery</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-gray-100">{visibleTotal} photos</span>
            <span>
              {showArchived
                ? `(${activeTotal} active, ${archivedTotal} archived)`
                : archivedTotal > 0
                  ? `(${activeTotal} active, ${archivedTotal} archived hidden)`
                  : `(${activeTotal} active)`}
            </span>
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <label className="flex w-full cursor-pointer items-center gap-2 sm:w-auto">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">Show Archived</span>
          </label>
          <button
            onClick={handleExportZip}
            disabled={isExporting || photoSections.length === 0}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-1.5 transition-colors sm:w-auto ${isExporting ? 'bg-gray-200 text-gray-500 dark:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
          >
            {isExporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Exporting…</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>Export ZIP</span>
              </>
            )}
          </button>
          <button
            onClick={() => router.back()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 sm:w-auto"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {photoSections.map((section, sectionIndex) => {
          const filteredPhotos = showArchived
            ? section.photos
            : section.photos.filter((photo) => !photo.isArchived);

          if (filteredPhotos.length === 0) return null;

          // Group photos: non-archived first, then archived
          const sortedPhotos = [...section.photos].sort((a, b) => {
            if (a.isArchived === b.isArchived) return 0;
            return a.isArchived ? 1 : -1;
          });

          return (
            <div key={sectionIndex}>
              <p className="mb-2 text-sm">
                {section.name}
                {(() => {
                  const activeCount = section.photos.filter((p) => !p.isArchived).length;
                  const archivedCount = section.photos.filter((p) => p.isArchived).length;
                  return (
                    <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                      {showArchived
                        ? `(${activeCount} active, ${archivedCount} archived)`
                        : archivedCount > 0
                          ? `(${activeCount} active, ${archivedCount} archived hidden)`
                          : `(${activeCount} active)`}
                    </span>
                  );
                })()}
              </p>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {sortedPhotos.map((photo, photoIndex) => {
                  if (!showArchived && photo.isArchived) return null;

                  // Calculate filtered index for modal navigation
                  const filteredPhotos = showArchived
                    ? sortedPhotos
                    : sortedPhotos.filter((p) => !p.isArchived);
                  const filteredIndex = filteredPhotos.findIndex((p) => p.id === photo.id);

                  const isValid = isValidImageSrc(photo.url);
                  return (
                    <div
                      key={photo.id || photoIndex}
                      className={`relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-800 ${photo.isArchived ? 'grayscale' : ''} group ${isValid ? 'cursor-pointer' : 'cursor-default'}`}
                      onClick={() => isValid && handleImageClick(sectionIndex, filteredIndex)}
                    >
                      {isValid ? (
                        <Image
                          src={photo.url}
                          alt={`${section.name} photo ${photoIndex + 1}`}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                          className={`object-cover transition-transform duration-300 hover:scale-105 ${photo.isArchived ? 'grayscale' : ''}`}
                          loading={sectionIndex === 0 && photoIndex < 6 ? 'eager' : 'lazy'}
                          quality={75}
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSEkLzYvLy02Mi85OEI2PTZFOT5ZXVlZfG1+fW6Ghn6QjpCOd3p3gHj/2wBDARUXFx4eHR8fHXhwLicucHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHD/wAARCAAIAAoDASIAAhEBAxEAPwCdABmX/9k="
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                          <div className="flex flex-col items-center gap-1">
                            <ImageOff size={20} />
                            <span className="text-xs">Image unavailable</span>
                          </div>
                        </div>
                      )}

                      {/* Archive indicator */}
                      {photo.isArchived && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-gray-800/80 px-2 py-1 text-xs text-white">
                          <Archive size={12} />
                          <span>Archived</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Viewer Modal */}
      {selectedSection && (
        <ImageViewerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          photos={selectedSection.photos}
          initialIndex={selectedImageIndex}
          sectionName={selectedSection.name}
        />
      )}
    </div>
  );
}

export default PhotoGallery;
