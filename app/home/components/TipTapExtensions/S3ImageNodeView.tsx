import React, { useEffect, useState, useRef } from 'react';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import { getImageHref } from '../../editor/utils/image';
import Image from '@tiptap/extension-image';
import { uploadData } from 'aws-amplify/storage';
import { getCurrentTenantId } from '../../utils/tenant-utils';
import { sanitizeFileName } from '../../utils/file-utils';
import { v4 as uuidv4 } from 'uuid';

console.log('[S3ImageNodeView] file loaded');

/**
 * S3ImageNodeView
 * React node view for TipTap image nodes that fetches a pre-signed S3 URL for the given S3 key.
 * @param {object} props - TipTap node view props
 * @returns {JSX.Element}
 */
const S3ImageNodeView = (props: any) => {
  console.log('[S3ImageNodeView] rendered', props);
  const { node, selected, updateAttributes } = props;
  const attrs = node.attrs ?? {};
  const s3Path = attrs['data-s3-path'];
  const src = attrs.src;
  const [url, setUrl] = useState<string | undefined>(undefined);
  const width = attrs.width;
  const height = attrs.height;
  const align = attrs.align;
  const imgRef = useRef<HTMLImageElement>(null);
  const [isResizing, setIsResizing] = useState<null | string>(null); // 'nw', 'ne', 'sw', 'se'
  const startPos = useRef<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [aspectLocked, setAspectLocked] = useState(true);
  const aspectRatio = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const uploadingId = attrs['data-uploading-id'];
  const altText = attrs.alt ?? 'image';

  // Compute style for alignment (block-level)
  let wrapperAlignmentStyle: React.CSSProperties = {};
  if (align === 'left') {
    wrapperAlignmentStyle.textAlign = 'left';
  } else if (align === 'right') {
    wrapperAlignmentStyle.textAlign = 'right';
  } else if (align === 'center') {
    wrapperAlignmentStyle.textAlign = 'center';
  } else if (align === 'justify') {
    wrapperAlignmentStyle.textAlign = 'justify';
  }

  // Image style (no float, just inline-block for resizing)
  let style: React.CSSProperties = {
    maxWidth: '100%',
    cursor: isResizing ? 'nwse-resize' : 'pointer',
    display: 'inline-block',
  };
  if (width) style.width = width;
  if (height) style.height = height;
  else style.height = 'auto';

  // eslint-disable-next-line react-hooks/exhaustive-deps -- synchronises upload lifecycle tied to mutable TipTap node attrs
  useEffect(() => {
    let cancelled = false;
    if (s3Path) {
      getImageHref(s3Path)
        .then((url) => {
          console.log('[S3ImageNodeView] url', url);
          if (!cancelled) setUrl(url);
        })
        .catch(() => setUrl(undefined));
    } else if (src) {
      setUrl(src);
    } else {
      setUrl(undefined);
    }
    setIsLoading(true); // Reset loading state when src changes
    return () => {
      cancelled = true;
    };
  }, [s3Path, src]);

  // Set aspect ratio on first select or when image size changes
  useEffect(() => {
    if (imgRef.current && selected) {
      const rect = imgRef.current.getBoundingClientRect();
      if (rect.width && rect.height) {
        aspectRatio.current = rect.width / rect.height;
      }
    }
  }, [selected, width, height]);

  // Handle drag-to-resize
  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!imgRef.current) return;
      // Use the initial mouse position and image size for calculations
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      let newWidth = startPos.current.width;
      let newHeight = startPos.current.height;
      if (isResizing === 'se') {
        newWidth = Math.max(20, startPos.current.width + dx);
        newHeight =
          aspectLocked && aspectRatio.current
            ? Math.max(20, newWidth / aspectRatio.current)
            : Math.max(20, startPos.current.height + dy);
      } else if (isResizing === 'sw') {
        newWidth = Math.max(20, startPos.current.width - dx);
        newHeight =
          aspectLocked && aspectRatio.current
            ? Math.max(20, newWidth / aspectRatio.current)
            : Math.max(20, startPos.current.height + dy);
      } else if (isResizing === 'ne') {
        newWidth = Math.max(20, startPos.current.width + dx);
        newHeight =
          aspectLocked && aspectRatio.current
            ? Math.max(20, newWidth / aspectRatio.current)
            : Math.max(20, startPos.current.height - dy);
      } else if (isResizing === 'nw') {
        newWidth = Math.max(20, startPos.current.width - dx);
        newHeight =
          aspectLocked && aspectRatio.current
            ? Math.max(20, newWidth / aspectRatio.current)
            : Math.max(20, startPos.current.height - dy);
      }
      updateAttributes({ width: `${newWidth}px`, height: `${newHeight}px` });
    };
    const handleMouseUp = () => {
      setIsResizing(null);
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'nwse-resize';
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [aspectLocked, isResizing, updateAttributes]);

  const handleResizeMouseDown = (corner: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(corner);
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      startPos.current = {
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
      };
    }
  };

  // Handle positions for four corners
  const handlePositions = [
    { corner: 'nw', style: { top: -8, left: -8, cursor: 'nwse-resize' } },
    { corner: 'ne', style: { top: -8, right: -8, cursor: 'nesw-resize' } },
    { corner: 'sw', style: { bottom: -8, left: -8, cursor: 'nesw-resize' } },
    { corner: 'se', style: { bottom: -8, right: -8, cursor: 'nwse-resize' } },
  ];

  useEffect(() => {
    // Only upload if we have a blob src, no s3 path, and a data-uploading-id
    if (!src || !src.startsWith('blob:') || s3Path || !uploadingId) return;
    (async () => {
      setIsLoading(true);
      const tenantId = await getCurrentTenantId();
      const newPath = `report-images/${tenantId}/${uuidv4()}-${sanitizeFileName(altText)}`;
      // Fetch the blob from the src
      const response = await fetch(src);
      const blob = await response.blob();
      await uploadData({ path: newPath, data: blob, options: { contentType: blob.type } });
      console.log('[S3ImageNodeView] uploaded image to', newPath);
      const presigned = await getImageHref(newPath);
      console.log('[S3ImageNodeView] presigned', presigned);
      // Update node attributes: set S3 path, remove uploading id, update src to presigned
      updateAttributes({
        'data-s3-path': newPath,
        'data-uploading-id': null,
      });
      setUrl(presigned); // Show the image immediately after upload
    })();
  }, [altText, src, s3Path, updateAttributes, uploadingId]);

  console.log('[S3ImageNodeView] <img> will render with url:', url, 'src:', src, 's3Path:', s3Path);

  return (
    <NodeViewWrapper
      as="div"
      className={selected ? 'ProseMirror-selectednode' : ''}
      style={{ position: 'relative', display: 'block', ...wrapperAlignmentStyle }}
    >
      {selected && (
        <button
          type="button"
          onClick={() => setAspectLocked((l) => !l)}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 30,
            background: aspectLocked ? '#007bff' : '#fff',
            color: aspectLocked ? '#fff' : '#007bff',
            border: '1px solid #007bff',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            opacity: 0.92,
          }}
          aria-label={aspectLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
        >
          {aspectLocked ? '🔒' : '🔓'}
        </button>
      )}
      <div style={{ display: 'inline-block', position: 'relative' }}>
        {selected &&
          handlePositions.map(({ corner, style: posStyle }) => (
            <div
              key={corner}
              style={{
                position: 'absolute',
                width: 16,
                height: 16,
                background: '#fff',
                border: '2px solid #007bff',
                borderRadius: '50%',
                zIndex: 20,
                ...posStyle,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseDown={handleResizeMouseDown(corner)}
              aria-label={`Resize image ${corner}`}
              role="button"
              tabIndex={0}
            />
          ))}
        {/* Skeleton placeholder while loading */}
        {isLoading && url && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: width || style.width || 120,
              height: height || style.height || 90,
              background: 'linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)',
              backgroundSize: '200% 100%',
              animation: 'skeleton-loading 1.2s infinite linear',
              zIndex: 1,
            }}
            aria-label="Loading image"
            role="status"
          />
        )}
        <img
          key={url}
          ref={imgRef}
          src={url}
          alt={node.attrs.alt || ''}
          role="img"
          aria-label={node.attrs.alt || 'Document image'}
          style={style}
          data-s3-path={s3Path || undefined}
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      </div>
      <style>{`
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </NodeViewWrapper>
  );
};

/**
 * S3ImageExtension
 * TipTap extension for images that uses the S3ImageNodeView for rendering.
 */
export const S3ImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-uploading-id': {
        default: null,
      },
      'data-s3-path': {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      align: {
        default: null,
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'img',
        getAttrs: (el: any) => {
          return {
            src: el.getAttribute('src'),
            alt: el.getAttribute('alt'),
            'data-s3-path': el.getAttribute('data-s3-path') || null,
            title: el.getAttribute('title'),
            width: el.getAttribute('width'),
            height: el.getAttribute('height'),
            align: el.getAttribute('align'),
          };
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      mergeAttributes(HTMLAttributes, {
        width: HTMLAttributes.width,
        height: HTMLAttributes.height,
        align: HTMLAttributes.align,
      }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(S3ImageNodeView);
  },
});

export { S3ImageNodeView };

export default S3ImageExtension;
