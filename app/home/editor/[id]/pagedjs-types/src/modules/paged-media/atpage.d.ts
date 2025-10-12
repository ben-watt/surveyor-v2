export default AtPage;
declare class AtPage extends Handler {
  pages: {};
  width: any;
  height: any;
  orientation: any;
  marginalia: {};
  pageModel(selector: any): {
    selector: any;
    name: undefined;
    psuedo: undefined;
    nth: undefined;
    marginalia: {};
    width: undefined;
    height: undefined;
    orientation: undefined;
    margin: {
      top: {};
      right: {};
      left: {};
      bottom: {};
    };
    padding: {
      top: {};
      right: {};
      left: {};
      bottom: {};
    };
    border: {
      top: {};
      right: {};
      left: {};
      bottom: {};
    };
    backgroundOrigin: undefined;
    block: {};
    marks: undefined;
    notes: undefined;
    added: boolean;
  };
  onAtPage(node: any, item: any, list: any): void;
  afterTreeWalk(ast: any, sheet: any): void;
  format: any;
  getTypeSelector(ast: any): undefined;
  getPsuedoSelector(ast: any): undefined;
  getNthSelector(ast: any): undefined;
  replaceMarginalia(ast: any): {};
  replaceNotes(ast: any): {};
  replaceDeclarations(ast: any): {};
  getSize(declaration: any): {
    width: undefined;
    height: undefined;
    orientation: undefined;
    format: undefined;
  };
  getMargins(declaration: any): {
    top: {};
    right: {};
    left: {};
    bottom: {};
  };
  getPaddings(declaration: any): {
    top: {};
    right: {};
    left: {};
    bottom: {};
  };
  getBorders(declaration: any): {
    top: {};
    right: {};
    left: {};
    bottom: {};
  };
  addPageClasses(pages: any, ast: any, sheet: any): void;
  createPage(
    page: any,
    ruleList: any,
    sheet: any,
  ): {
    type: string;
    prelude: {
      type: string;
      children: any;
    };
    block: any;
  };
  addMarginVars(margin: any, list: any, item: any): void;
  addPaddingVars(padding: any, list: any, item: any): void;
  addBorderVars(border: any, list: any, item: any): void;
  addDimensions(width: any, height: any, orientation: any, list: any, item: any): void;
  addMarginaliaStyles(page: any, list: any, item: any, sheet: any): void;
  addMarginaliaContent(page: any, list: any, item: any, sheet: any): void;
  addRootVars(
    ast: any,
    width: any,
    height: any,
    orientation: any,
    bleed: any,
    bleedrecto: any,
    bleedverso: any,
    marks: any,
  ): void;
  addNotesStyles(notes: any, page: any, list: any, item: any, sheet: any): void;
  addRootPage(ast: any, size: any, bleed: any, bleedrecto: any, bleedverso: any): void;
  getNth(nth: any): {
    type: string;
    loc: null;
    selector: null;
    nth: {
      type: string;
      loc: null;
      a: any;
      b: any;
    };
  };
  addPageAttributes(page: any, start: any, pages: any): void;
  getStartElement(content: any, breakToken: any): any;
  beforePageLayout(page: any, contents: any, breakToken: any, chunker: any): void;
  afterPageLayout(page: any, contents: any, breakToken: any, chunker: any): void;
  finalizePage(fragment: any, page: any, breakToken: any, chunker: any): void;
  selectorsForPage(page: any): any;
  selectorsForPageMargin(page: any, margin: any): any;
  createDeclaration(
    property: any,
    value: any,
    important: any,
  ): {
    type: string;
    loc: null;
    important: any;
    property: any;
    value: {
      type: string;
      loc: null;
      children: any;
    };
  };
  createVariable(
    property: any,
    value: any,
  ): {
    type: string;
    loc: null;
    property: any;
    value: {
      type: string;
      value: any;
    };
  };
  createCalculatedDimension(
    property: any,
    items: any,
    important: any,
    operator?: string,
  ): {
    type: string;
    loc: null;
    important: any;
    property: any;
    value: {
      type: string;
      loc: null;
      children: any;
    };
  };
  createDimension(
    property: any,
    cssValue: any,
    important: any,
  ): {
    type: string;
    loc: null;
    important: any;
    property: any;
    value: {
      type: string;
      loc: null;
      children: any;
    };
  };
  createBlock(declarations: any): {
    type: string;
    loc: null;
    children: any;
  };
  createRule(
    selectors: any,
    block: any,
  ): {
    type: string;
    prelude: {
      type: string;
      children: any;
    };
    block: any;
  };
}
import Handler from '../handler.js';
