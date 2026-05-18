import { AntigravityServer } from '../core/server/index';
import { ServerConfig } from '../core/config';
import * as path from 'path';

// Parse CLI arguments
const args = process.argv.slice(2);
let port = 3000;
let host = '';
let useHttps = false;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' || args[i] === '-p') {
        port = parseInt(args[i + 1], 10);
        i++;
    } else if (args[i] === '--host' || args[i] === '-h') {
        host = args[i + 1];
        i++;
    } else if (args[i] === '--https') {
        useHttps = true;
    }
}

// standalone runs relative to its build directory
const extensionPath = path.dirname(__dirname);
const workspaceRoot = process.cwd();

console.log(`🚀 Starting Gravity Standalone Link Server...`);
console.log(`-----------------------------------------------`);
console.log(`Port: ${port}`);
console.log(`Preferred Host: ${host || 'Auto-detect'}`);
console.log(`HTTPS: ${useHttps ? 'Enabled' : 'Disabled'}`);
console.log(`Mode: Tokenless`);
console.log(`-----------------------------------------------`);

const serverConfig: ServerConfig = {
    port,
    host,
    useHttps,
    strictWorkbenchOnly: true, // standalone default
    includeFallbackTargets: false // standalone default
};

const server = new AntigravityServer(
    serverConfig,
    extensionPath,
    workspaceRoot,
    undefined, // no primarySendFn (falls back to CDP DOM injection)
    async () => '', // no getActiveCascadeIdFn
    (msg) => console.log(msg) // log directly to console
);

server.start().then((urls) => {
    console.log(`\n✅ Gravity Link is running tokenless!`);
    console.log(`Open in browser: ${urls.localUrl}`);
    console.log(`Close the server with Ctrl+C\n`);
}).catch((err) => {
    console.error(`❌ Failed to start server:`, err);
    process.exit(1);
});
