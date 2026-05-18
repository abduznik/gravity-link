import { AntigravityServer } from './server/index';
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

console.log(`🚀 Starting Antigravity Standalone Link Server...`);
console.log(`-----------------------------------------------`);
console.log(`Port: ${port}`);
console.log(`Preferred Host: ${host || 'Auto-detect'}`);
console.log(`HTTPS: ${useHttps ? 'Enabled' : 'Disabled'}`);
console.log(`Mode: Tokenless`);
console.log(`-----------------------------------------------`);

const server = new AntigravityServer(
    port,
    extensionPath,
    workspaceRoot,
    useHttps,
    host,
    undefined, // no primarySendFn (falls back to CDP DOM injection)
    async () => '', // no getActiveCascadeIdFn
    (msg) => console.log(msg) // log directly to console
);

server.start().then((urls) => {
    console.log(`\n✅ Antigravity Link is running tokenless!`);
    console.log(`Open in browser: ${urls.localUrl}`);
    console.log(`Close the server with Ctrl+C\n`);
}).catch((err) => {
    console.error(`❌ Failed to start server:`, err);
    process.exit(1);
});
