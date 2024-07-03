"use client";

import { useEditor, EditorContent, BubbleMenu, ReactRenderer } from "@tiptap/react";
import Mention from '@tiptap/extension-mention'
import StarterKit from "@tiptap/starter-kit";
import MentionList from "../MentionList";
import tippy from 'tippy.js';

const BlockEditor = () => {

  const configuredMention = Mention.configure({
    renderHTML({ options, node }) {
        return ['span', options.HTMLAttributes, node.content]
    },
    suggestion: {
        char: "{",
        items: ({ query }) => {
            return [
              'Lea Thompson',
              'Cyndi Lauper',
              'Tom Cruise',
              'Madonna',
              'Jerry Hall',
              'Joan Collins',
              'Winona Ryder',
              'Christina Applegate',
              'Alyssa Milano',
              'Molly Ringwald',
              'Ally Sheedy',
              'Debbie Harry',
              'Olivia Newton-John',
              'Elton John',
              'Michael J. Fox',
              'Axl Rose',
              'Emilio Estevez',
              'Ralph Macchio',
              'Rob Lowe',
              'Jennifer Grey',
              'Mickey Rourke',
              'John Cusack',
              'Matthew Broderick',
              'Justine Bateman',
              'Lisa Bonet',
            ]
              .filter(item => item.toLowerCase().startsWith(query.toLowerCase()))
              .slice(0, 5)
          },
          render: () => {
            let component : any
            let popup : any 

            console.log("render")
        
            return {
              onStart: props => {
                console.log("onStart")
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                })
        
                if (!props.clientRect) {
                  return
                }
        
                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                })
              },
              onUpdate(props) {
                component.updateProps(props)
        
                if (!props.clientRect) {
                  return
                }
        
                popup[0].setProps({
                  getReferenceClientRect: props.clientRect,
                })
              },
        
              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  popup[0].hide()
        
                  return true
                }
        
                return component.ref?.onKeyDown(props)
              },
        
              onExit() {
                popup[0].destroy()
                component.destroy()
              },
            }
          },
    }
  });


  const editor = useEditor({
    extensions: [StarterKit, configuredMention],
    content: "<p>Hello World! 🌎️</p>",
  });

  if(editor == null)
    return null;


  return (
    <div>
      <BubbleMenu className="border border-black p-1 bg-white flex space-x-2 rounded-sm" editor={editor} tippyOptions={{ duration: 100 }}>
        <button onClick={() => editor.chain().focus().toggleBold().run()}>Bold</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()}>Strike</button>
      </BubbleMenu>
      <EditorContent className="border border-grey-800 p-2" editor={editor} />
    </div>
  );
};

export default BlockEditor;