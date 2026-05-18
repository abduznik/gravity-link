export interface ServerConfig {
    port: number;
    host?: string;
    useHttps?: boolean;
    strictWorkbenchOnly?: boolean;
    includeFallbackTargets?: boolean;
}
