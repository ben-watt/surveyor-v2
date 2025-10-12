import React from 'react';
import ReactDOMServer from 'react-dom/server';

// Type definition for Tiptap DOMSpec
type DOMSpec = [string, Record<string, any>, ...(DOMSpec | string)[]] | string;

/**
 * Recursive function to convert a DOM node to Tiptap DOMSpec.
 * @param element - The DOM node to convert.
 * @returns A Tiptap-compatible DOMSpec.
 */
function domToDomSpec(element: Node): DOMSpec {
  if (element.nodeType === Node.TEXT_NODE) {
    // If it's a text node, return its text content
    return element.textContent || '';
  }

  if (element.nodeType === Node.ELEMENT_NODE) {
    const el = element as HTMLElement;

    // Extract attributes into a key-value object
    const attributes: Record<string, string> = {};
    Array.from(el.attributes).forEach((attr) => {
      attributes[attr.name] = attr.value;
    });

    // Recursively process child nodes
    const children: DOMSpec[] = Array.from(el.childNodes).map(domToDomSpec);

    // Return a Tiptap-compatible DOMSpec
    return [el.tagName.toLowerCase(), attributes, ...children];
  }

  // For unsupported node types, return an empty string
  return '';
}

/**
 * Renders a React JSX element to Tiptap DOMSpec.
 * @param jsx - The React JSX element to convert.
 * @returns A Tiptap-compatible DOMSpec.
 */
export function renderReactToDomSpec(jsx: React.ReactNode): DOMSpec {
  // Render the React JSX to a static HTML string
  const htmlString = ReactDOMServer.renderToStaticMarkup(jsx);

  // Create a temporary DOM element to parse the HTML string
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;

  // Convert the parsed DOM into a Tiptap-compatible DOMSpec
  const firstChild = tempDiv.firstChild;
  if (!firstChild) {
    throw new Error('No root element found in rendered JSX.');
  }

  return domToDomSpec(firstChild);
}
