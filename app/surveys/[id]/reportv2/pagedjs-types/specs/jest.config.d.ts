declare namespace _default {
    let testMatch: string[];
    let globalSetup: string;
    let globalTeardown: string;
    let testEnvironment: string;
    let setupFilesAfterEnv: string[];
    let transform: {
        "\\.js$": (string | {
            configFile: string;
        })[];
    };
}
export default _default;
