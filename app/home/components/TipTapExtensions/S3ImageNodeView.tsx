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
  const { node, selected } = props;
  const s3Path = node.attrs['data-s3-path'];
  const src = node.attrs.src;
  const [url, setUrl] = useState<string | undefined>(undefined);
  const width = node.attrs.width;
  const height = node.attrs.height;
  const align = node.attrs.align;
  const imgRef = useRef<HTMLImageElement>(null);
  const [isResizing, setIsResizing] = useState<null | string>(null); // 'nw', 'ne', 'sw', 'se'
  const startPos = useRef<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });
  const [aspectLocked, setAspectLocked] = useState(true);
  const aspectRatio = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Compute style for alignment
  let alignmentStyle = {};
  if (align === 'left') {
    alignmentStyle = { float: 'left', margin: '0 1em 1em 0' };
  } else if (align === 'right') {
    alignmentStyle = { float: 'right', margin: '0 0 1em 1em' };
  } else if (align === 'center') {
    alignmentStyle = { display: 'block', margin: '0 auto 1em auto' };
  }

  useEffect(() => {
    let cancelled = false;
    if (s3Path) {
      getImageHref(s3Path)
        .then(url => {
          console.log("[S3ImageNodeView] url", url);
          if (!cancelled) setUrl(url);
        })
        .catch(() => setUrl(undefined));
    } else if (src) {
      setUrl(src);
    } else {
      setUrl(undefined);
    }
    setIsLoading(true); // Reset loading state when src changes
    return () => { cancelled = true; };
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

  // Compute style for alignment and sizing
  let style: React.CSSProperties = { maxWidth: '100%', cursor: isResizing ? 'nwse-resize' : 'pointer', ...alignmentStyle };
  if (width) style.width = width;
  if (height) style.height = height;
  else style.height = 'auto';

  // Handle drag-to-resize
  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      let newWidth = startPos.current.width;
      let newHeight = startPos.current.height;
      if (isResizing === 'se') {
        newWidth = Math.max(20, e.clientX - rect.left + startPos.current.width - rect.width);
        if (aspectLocked && aspectRatio.current) {
          newHeight = Math.max(20, newWidth / aspectRatio.current);
        } else {
          newHeight = Math.max(20, e.clientY - rect.top + startPos.current.height - rect.height);
        }
      } else if (isResizing === 'sw') {
        newWidth = Math.max(20, rect.right - e.clientX + startPos.current.width - rect.width);
        if (aspectLocked && aspectRatio.current) {
          newHeight = Math.max(20, newWidth / aspectRatio.current);
        } else {
          newHeight = Math.max(20, e.clientY - rect.top + startPos.current.height - rect.height);
        }
      } else if (isResizing === 'ne') {
        newWidth = Math.max(20, e.clientX - rect.left + startPos.current.width - rect.width);
        if (aspectLocked && aspectRatio.current) {
          newHeight = Math.max(20, newWidth / aspectRatio.current);
        } else {
          newHeight = Math.max(20, rect.bottom - e.clientY + startPos.current.height - rect.height);
        }
      } else if (isResizing === 'nw') {
        newWidth = Math.max(20, rect.right - e.clientX + startPos.current.width - rect.width);
        if (aspectLocked && aspectRatio.current) {
          newHeight = Math.max(20, newWidth / aspectRatio.current);
        } else {
          newHeight = Math.max(20, rect.bottom - e.clientY + startPos.current.height - rect.height);
        }
      }
      props.updateAttributes({ width: newWidth + 'px', height: newHeight + 'px' });
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
  }, [isResizing, props, aspectLocked]);

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
    if (
      src &&
      src.startsWith('blob:') &&
      !s3Path &&
      node.attrs['data-uploading-id'] &&
      !node.attrs['data-s3-path']
    ) {
      (async () => {
        setIsLoading(true);
        const tenantId = await getCurrentTenantId();
        const s3Path = `report-images/${tenantId}/${uuidv4()}-${sanitizeFileName(node.attrs.alt || 'image')}`;
        // Fetch the blob from the src
        const response = await fetch(src);
        const blob = await response.blob();
        await uploadData({ path: s3Path, data: blob, options: { contentType: blob.type } });
        console.log("[S3ImageNodeView] uploaded image to", s3Path);
        const presigned = await getImageHref(s3Path);
        console.log("[S3ImageNodeView] presigned", presigned);
        // Update node attributes: set S3 path, remove uploading id, update src to presigned
        props.updateAttributes({
          'data-s3-path': s3Path,
          'data-uploading-id': null,
        });
        setUrl(presigned); // Show the image immediately after upload
        console.log("[S3ImageNodeView] updated attributes", props.node.attrs);
      })();
    }
  }, [src, s3Path, node.attrs['data-uploading-id']]);

  console.log('[S3ImageNodeView] <img> will render with url:', url, 'src:', src, 's3Path:', s3Path);

  return (
    <NodeViewWrapper as="span" className={selected ? 'ProseMirror-selectednode' : ''} style={{ position: 'relative', display: 'inline-block' }}>
      {selected && (
        <button
          type="button"
          onClick={() => setAspectLocked(l => !l)}
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
      {selected && handlePositions.map(({ corner, style: posStyle }) => (
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
          role="slider"
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
        tag: 'img[data-s3-path]',
        getAttrs: (el: any) => {
          return {
            src: el.getAttribute('src'),
            alt: el.getAttribute('alt'),
            'data-s3-path': el.getAttribute('data-s3-path'),
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