export default Polisher;
declare class Polisher {
    constructor(setup: any);
    sheets: any[];
    inserted: any[];
    hooks: {};
    setup(): CSSStyleSheet | null;
    base: HTMLStyleElement | undefined;
    styleEl: HTMLStyleElement | undefined;
    styleSheet: CSSStyleSheet | null | undefined;
    add(...args: any[]): Promise<string>;
    convertViaSheet(cssStr: any, href: any): Promise<any>;
    width: any;
    height: any;
    orientation: any;
    insert(text: any): HTMLStyleElement;
    destroy(): void;
}
