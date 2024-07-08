export default Chunker;
/**
 * Chop up text into flows
 * @class
 */
declare class Chunker {
    constructor(content: any, renderTo: any, options: any);
    settings: any;
    hooks: {};
    pages: any[];
    total: number;
    q: Queue;
    stopped: boolean;
    rendered: boolean;
    content: any;
    charsPerBreak: any[];
    setup(renderTo: any): void;
    pagesArea: HTMLDivElement | undefined;
    pageTemplate: HTMLTemplateElement | undefined;
    flow(content: any, renderTo: any): Promise<this>;
    source: ContentParser | undefined;
    breakToken: any;
    render(parsed: any, startAt: any): Promise<any>;
    start(): void;
    stop(): void;
    renderOnIdle(renderer: any): Promise<any>;
    renderAsync(renderer: any): Promise<any>;
    handleBreaks(node: any, force: any): Promise<void>;
    layout(content: any, startAt: any): {};
    recoredCharLength(length: any): void;
    maxChars: number | undefined;
    removePages(fromIndex?: number): void;
    addPage(blank: any): Page;
    clonePage(originalPage: any): Promise<void>;
    loadFonts(): Promise<void | any[]>;
    destroy(): void;
}
import Queue from "../utils/queue.js";
import ContentParser from "./parser.js";
import Page from "./page.js";
