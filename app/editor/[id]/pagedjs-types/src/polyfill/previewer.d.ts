export default Previewer;
declare class Previewer {
    constructor(options: any);
    settings: any;
    polisher: Polisher;
    chunker: Chunker;
    hooks: {};
    size: {
        width: {
            value: number;
            unit: string;
        };
        height: {
            value: number;
            unit: string;
        };
        format: undefined;
        orientation: undefined;
    };
    initializeHandlers(): import("../utils/handlers.js").Handlers;
    atpages: any;
    registerHandlers(...args: any[]): void;
    getParams(name: any): string | undefined;
    wrapContent(): any;
    removeStyles(doc?: Document): any[];
    preview(content: any, stylesheets: any, renderTo: any): Promise<Chunker>;
    handlers: import("../utils/handlers.js").Handlers | undefined;
}
import Polisher from "../polisher/polisher.js";
import Chunker from "../chunker/chunker.js";
