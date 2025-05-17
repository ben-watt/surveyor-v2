import React, { useEffect, useState } from 'react';
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

  return (
    <NodeViewWrapper as="span" className={selected ? 'ProseMirror-selectednode' : ''}>
      <img
        src={url}
        alt={node.attrs.alt || ''}
        role="img"
        aria-label={node.attrs.alt || 'Document image'}
        style={{ maxWidth: '100%', height: 'auto', cursor: 'pointer' }}
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
    };
  },
  parseHTML() {
    return [
      {
        tag: 'img[data-s3-path]',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(S3ImageNodeView);
  },
});

export default S3ImageExtension; 