import React, { useEffect, useState, useRef } from 'react';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import { getImageHref } from '../../editor/utils/image';

/**
 * S3ImageNodeView
 * React node view for TipTap image nodes that fetches a pre-signed S3 URL for the given S3 key.
 * @param {object} props - TipTap node view props
 * @returns {JSX.Element}
 */
const S3ImageNodeView = (props: any) => {
  const { node, selected } = props;
  const s3Path = node.attrs['data-s3-path'];
  const [url, setUrl] = useState<string | undefined>(undefined);
  const width = node.attrs.width;
  const height = node.attrs.height;
  const align = node.attrs.align;
  const imgRef = useRef<HTMLImageElement>(null);
  const [isResizing, setIsResizing] = useState<null | string>(null); // 'nw', 'ne', 'sw', 'se'
  const startPos = useRef<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });

  // Compute style for alignment
  let alignmentStyle = {};
  if (align === 'left') {
    alignmentStyle = { float: 'left', margin: '0 1em 1em 0' };
  } else if (align === 'right') {
    alignmentStyle = { float: 'right', margin: '0 0 1em 1em' };
  } else if (align === 'center') {
    alignmentStyle = { display: 'block', margin: '0 auto 1em auto' };
  }

  console.log("[S3ImageNodeView] s3Path", s3Path);

  useEffect(() => {
    let cancelled = false;
    if (s3Path) {
      getImageHref(s3Path)
        .then(url => {
          console.log("[S3ImageNodeView] url", url);
          if (!cancelled) setUrl(url);
        })
        .catch(() => setUrl(undefined));
    }
    return () => { cancelled = true; };
  }, [s3Path]);

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
        newHeight = Math.max(20, e.clientY - rect.top + startPos.current.height - rect.height);
      } else if (isResizing === 'sw') {
        newWidth = Math.max(20, rect.right - e.clientX + startPos.current.width - rect.width);
        newHeight = Math.max(20, e.clientY - rect.top + startPos.current.height - rect.height);
      } else if (isResizing === 'ne') {
        newWidth = Math.max(20, e.clientX - rect.left + startPos.current.width - rect.width);
        newHeight = Math.max(20, rect.bottom - e.clientY + startPos.current.height - rect.height);
      } else if (isResizing === 'nw') {
        newWidth = Math.max(20, rect.right - e.clientX + startPos.current.width - rect.width);
        newHeight = Math.max(20, rect.bottom - e.clientY + startPos.current.height - rect.height);
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
  }, [isResizing, props]);

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

  return (
    <NodeViewWrapper as="span" className={selected ? 'ProseMirror-selectednode' : ''} style={{ position: 'relative', display: 'inline-block' }}>
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
      <img
        ref={imgRef}
        src={url}
        alt={node.attrs.alt || ''}
        role="img"
        aria-label={node.attrs.alt || 'Document image'}
        style={style}
        data-s3-path={s3Path}
      />
    </NodeViewWrapper>
  );
};

/**
 * S3ImageExtension
 * TipTap extension for images that uses the S3ImageNodeView for rendering.
 */
export const S3ImageExtension = Node.create({
  name: 'image',
  group: 'inline',
  inline: true,
  draggable: true,
  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      'data-s3-path': {
        default: null,
      },
      title: {
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
    return ['img', mergeAttributes(HTMLAttributes, {
      width: HTMLAttributes.width,
      height: HTMLAttributes.height,
      align: HTMLAttributes.align,
    })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(S3ImageNodeView);
  },
});

export { S3ImageNodeView };

export default S3ImageExtension; 