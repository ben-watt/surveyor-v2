export default PuppeteerEnvironment;
declare class PuppeteerEnvironment {
    constructor(config: any);
    setup(): Promise<void>;
    teardown(): Promise<void>;
    runScript(script: any): any;
    handleError(error: any): void;
    loadPage(path: any): Promise<any>;
}
