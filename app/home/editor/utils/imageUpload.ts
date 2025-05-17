import { v4 as uuidv4 } from 'uuid';
import { Editor } from '@tiptap/react';

/**
 * Inserts an image node with a blob URL and a unique uploading ID.
 * @param editor TipTap editor instance
 * @param file Image file to insert
 * @param pos Optional position to insert at (defaults to current selection)
 */
export async function insertImageFromFile(editor: Editor, file: File, pos?: number) {
  const tempId = uuidv4();
  const blobUrl = URL.createObjectURL(file);
  editor.chain().focus().insertContentAt(pos ?? editor.state.selection.anchor, {
    type: 'image',
    attrs: {
      src: blobUrl,
      alt: file.name,
      'data-s3-path': '',
      'data-uploading-id': tempId,
    },
  }).run();
} 