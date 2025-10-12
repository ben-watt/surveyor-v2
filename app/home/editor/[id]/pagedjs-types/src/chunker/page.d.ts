export default Page;
/**
 * Render a page
 * @class
 */
declare class Page {
  constructor(pagesArea: any, pageTemplate: any, blank: any, hooks: any, options: any);
  pagesArea: any;
  pageTemplate: any;
  blank: any;
  width: number | undefined;
  height: number | undefined;
  hooks: any;
  settings: any;
  create(template: any, after: any): any;
  element: any;
  pagebox: any;
  area: any;
  footnotesArea: any;
  createWrapper(): HTMLDivElement;
  wrapper: HTMLDivElement | undefined;
  index(pgnum: any): void;
  position: any;
  id: string | undefined;
  layout(contents: any, breakToken: any, prevPage: any): Promise<any>;
  startToken: any;
  layoutMethod: Layout | undefined;
  endToken: any;
  append(contents: any, breakToken: any): Promise<any>;
  getByParent(ref: any, entries: any): any;
  onOverflow(func: any): void;
  _onOverflow: any;
  onUnderflow(func: any): void;
  _onUnderflow: any;
  clear(): void;
  addListeners(contents: any): boolean;
  _checkOverflowAfterResize: (() => void) | undefined;
  _onScroll: (() => void) | undefined;
  listening: boolean | undefined;
  removeListeners(): void;
  addResizeObserver(contents: any): void;
  ro: ResizeObserver | undefined;
  checkOverflowAfterResize(contents: any): void;
  checkUnderflowAfterResize(contents: any): void;
  destroy(): void;
}
import Layout from './layout.js';
