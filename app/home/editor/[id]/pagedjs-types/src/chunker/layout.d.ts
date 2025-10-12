export default Layout;
/**
 * Layout
 * @class
 */
declare class Layout {
  constructor(element: any, hooks: any, options: any);
  element: any;
  bounds: any;
  parentBounds: any;
  gap: number;
  hooks: any;
  settings: any;
  maxChars: any;
  forceRenderBreak: boolean;
  renderTo(
    wrapper: any,
    source: any,
    breakToken: any,
    prevPage?: null,
    bounds?: any,
  ): Promise<RenderResult>;
  failed: boolean | undefined;
  breakAt(node: any, offset?: number, forcedBreakQueue?: any[]): BreakToken;
  shouldBreak(node: any, limiter: any): boolean;
  forceBreak(): void;
  getStart(source: any, breakToken: any): any;
  /**
   * Merge items from source into dest which don't yet exist in dest.
   *
   * @param {element} dest
   *   A destination DOM node tree.
   * @param {element} source
   *   A source DOM node tree.
   *
   * @returns {void}
   */
  addOverflowNodes(dest: element, source: element): void;
  /**
   * Add overflow to new page.
   *
   * @param {element} dest
   *   The page content being built.
   * @param {breakToken} breakToken
   *   The current break cotent.
   * @param {element} alreadyRendered
   *   The content that has already been rendered.
   *
   * @returns {void}
   */
  addOverflowToPage(dest: element, breakToken: any, alreadyRendered: element): void;
  /**
   * Add text to new page.
   *
   * @param {element} node
   *   The node being appended to the destination.
   * @param {element} dest
   *   The destination to which content is being added.
   * @param {breakToken} breakToken
   *   The current breakToken.
   * @param {bool} shallow
   *	 Whether to do a shallow copy of the node.
   * @param {bool} rebuild
   *   Whether to rebuild parents.
   *
   * @returns {ChildNode}
   *   The cloned node.
   */
  append(node: element, dest: element, breakToken: any, shallow?: bool, rebuild?: bool): ChildNode;
  rebuildTableFromBreakToken(breakToken: any, dest: any): void;
  waitForImages(imgs: any): Promise<void>;
  awaitImageLoaded(image: any): Promise<any>;
  avoidBreakInside(node: any, limiter: any): any;
  createOverflow(overflow: any, rendered: any, source: any): Overflow | undefined;
  lastChildCheck(parentElement: any, rootElement: any): void;
  processOverflowResult(
    ranges: any,
    rendered: any,
    source: any,
    bounds: any,
    prevBreakToken: any,
    node: any,
    extract: any,
  ): undefined;
  findBreakToken(
    rendered: any,
    source: any,
    bounds: any,
    prevBreakToken: any,
    node?: null,
    extract?: boolean,
  ): undefined;
  /**
   * Does the element exceed the bounds?
   *
   * @param {element} element
   *   The element being constrained.
   * @param {array} bounds
   *   The bounding element.
   *
   * @returns {bool}
   *   Whether the element is within bounds.
   */
  hasOverflow(element: any, bounds?: array): bool;
  /**
   * Returns the first child that overflows the bounds.
   *
   * There may be no children that overflow (the height might be extended
   * by a sibling). In this case, this function returns NULL.
   *
   * @param {node} node
   *   The parent node of the children we are searching.
   * @param {array} bounds
   *   The bounds of the page area.
   * @returns {ChildNode | null | undefined}
   *   The first overflowing child within the node.
   */
  firstOverflowingChild(node: any, bounds: array): ChildNode | null | undefined;
  startOfOverflow(node: any, bounds: any): any[];
  rowspanNeedsBreakAt(tableRow: any, rendered: any): any;
  findOverflow(rendered: any, bounds: any, source: any): Range[] | undefined;
  findEndToken(rendered: any, source: any): BreakToken | undefined;
  textBreak(node: any, start: any, end: any, vStart: any, vEnd: any): number | undefined;
  removeOverflow(overflow: any, breakLetter: any): any;
  hyphenateAtBreak(startContainer: any, breakLetter: any): void;
  equalTokens(a: any, b: any): boolean;
}
import RenderResult from './renderresult.js';
import BreakToken from './breaktoken.js';
import Overflow from './overflow.js';
