import * as vscode from 'vscode';
import { AntigravityServer } from './server/index';
import { getActiveCascadeIdFromLs } from './services/ls-discovery';
import qrcode from 'qrcode';
import os from 'os';

let server: AntigravityServer | null = null;
let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;

// Global Context
let globalContext: vscode.ExtensionContext;

export async function activate(context: vscode.ExtensionContext) {
    globalContext = context;
    outputChannel = vscode.window.createOutputChannel("Gravity Link");
    outputChannel.appendLine("🚀 Gravity Link: Activating...");

    // Status Bar Item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = "gravity-link.showQR";
    context.subscriptions.push(statusBarItem);

    // Register Commands (supporting both rebranded and legacy names)
    const register = (legacyName: string, rebrandedName: string, handler: (...args: any[]) => any) => {
        context.subscriptions.push(vscode.commands.registerCommand(legacyName, handler));
        context.subscriptions.push(vscode.commands.registerCommand(rebrandedName, handler));
    };

    register('antigravity-link.start', 'gravity-link.start', async () => {
        await startServer(context);
    });
    register('antigravity-link.stop', 'gravity-link.stop', async () => {
        await stopServer();
    });
    register('antigravity-link.showQR', 'gravity-link.showQR', async () => {
        await showQR();
    });
    register('antigravity-link.selectNetworkInterface', 'gravity-link.selectNetworkInterface', async () => {
            const interfaces = os.networkInterfaces();
            const candidates: { label: string; description?: string; addr: string }[] = [];
            
            // Add custom IP option
            candidates.push({
                label: "$(pencil) Enter custom/Tailscale IP manually...",
                description: "Type your Tailscale IP or any other custom IP/host address",
                addr: "custom"
            });

            for (const [name, addrs] of Object.entries(interfaces)) {
                for (const addr of addrs || []) {
                    if (!addr.internal && addr.family === 'IPv4') {
                        candidates.push({
                            label: addr.address,
                            description: `${name} — ${addr.address}`,
                            addr: addr.address
                        });
                    }
                }
            }

            const pick = await vscode.window.showQuickPick(candidates, {
                placeHolder: 'Select a network interface or enter a custom IP manually'
            });

            if (pick) {
                let chosenIp: string | undefined = pick.addr;
                if (chosenIp === 'custom') {
                    const currentHost = vscode.workspace.getConfiguration('antigravityLink').get<string>('preferredHost', '');
                    chosenIp = await vscode.window.showInputBox({
                        prompt: "Enter custom/Tailscale IP address",
                        placeHolder: "e.g. 100.115.92.10",
                        value: currentHost,
                        ignoreFocusOut: true
                    });
                }
                
                if (chosenIp !== undefined) {
                    const finalIp = chosenIp.trim();
                    await getLinkConfig().update('preferredHost', finalIp, vscode.ConfigurationTarget.Global);
                    if (finalIp) {
                        vscode.window.showInformationMessage(`Server IP/host set to ${finalIp}. Restart the server to apply.`);
                    } else {
                        vscode.window.showInformationMessage(`Preferred IP cleared. Restart the server to use default auto-detection.`);
                    }
                }
            }
        });

    // Check Auto-Start (supporting both rebranded and legacy names)
    const config = getLinkConfig();
    if (config.get('autoStart', false)) {
        await startServer(context, true);
    } else {
        updateStatusBar(false);
    }
}

function getLinkConfig(): vscode.WorkspaceConfiguration {
    const newConfig = vscode.workspace.getConfiguration('gravityLink');
    const oldConfig = vscode.workspace.getConfiguration('antigravityLink');
    if (newConfig.get('port') === 3000 && oldConfig.get('port') !== 3000) {
        return oldConfig;
    }
    return newConfig;
}

async function startServer(context: vscode.ExtensionContext, isAutoStart: boolean = false) {
    if (server) {
        vscode.window.showInformationMessage("Gravity Link server is already running.");
        return;
    }

    const config = getLinkConfig();
    let preferredHost = config.get<string>('preferredHost', '').trim();

    // If we don't have a configured IP, prompt the user to set it up once.
    if (!preferredHost) {
        const inputIp = await vscode.window.showInputBox({
            prompt: "Enter the Tailscale IP (or Host IP) to use for the Gravity Link server",
            placeHolder: "e.g. 100.115.92.10",
            value: preferredHost,
            ignoreFocusOut: true
        });

        if (inputIp === undefined) {
            vscode.window.showWarningMessage("Server start cancelled. No IP address provided.");
            return;
        }

        preferredHost = inputIp.trim();
        // Update settings globally so it is setup once
        await config.update('preferredHost', preferredHost, vscode.ConfigurationTarget.Global);

        if (!preferredHost) {
            vscode.window.showWarningMessage("Starting server with default local IP interface since no preferred IP was entered.");
        }
    }

    outputChannel.appendLine(`[Extension] Starting server with preferredHost: "${preferredHost}"`);

    const port = config.get<number>('port', 3000);
    const useHttps = config.get<boolean>('useHttps', true);
    const strictWorkbenchOnly = config.get<boolean>('strictWorkbenchOnly', true);
    const includeFallbackTargets = config.get<boolean>('includeFallbackTargets', false);
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    process.env.AG_STRICT_WORKBENCH_ONLY = strictWorkbenchOnly ? 'true' : 'false';
    process.env.AG_INCLUDE_FALLBACK_TARGETS = includeFallbackTargets ? 'true' : 'false';

    // Create primary send function using VS Code commands (more reliable than CDP DOM injection)
    const primarySendFn = async (message: string): Promise<boolean> => {
        try {
            // Try sendTextToChat first, then sendPromptToAgentPanel as secondary
            await vscode.commands.executeCommand('antigravity.sendTextToChat', message);
            return true;
        } catch {
            try {
                await vscode.commands.executeCommand('antigravity.sendPromptToAgentPanel', message);
                return true;
            } catch {
                return false;
            }
        }
    };

    // Resolve the active cascade ID. Try the VS Code getDiagnostics command first
    // (fastest — returns googleAgentId which maps to cascadeId), then fall back to
    // querying the LS RPC directly via GetAllCascadeTrajectories.
    const getActiveCascadeIdFn = async (): Promise<string> => {
        try {
            const raw = await vscode.commands.executeCommand<string>('antigravity.getDiagnostics');
            if (raw && typeof raw === 'string') {
                const diag = JSON.parse(raw);
                const id: string = diag?.recentTrajectories?.[0]?.googleAgentId ?? '';
                if (id) return id;
            }
        } catch { /* fall through */ }
        return getActiveCascadeIdFromLs();
    };

    // Start the server
    const newServer = new AntigravityServer(
        port,
        context.extensionPath,
        workspaceRoot,
        useHttps,
        preferredHost,
        primarySendFn,
        getActiveCascadeIdFn,
        (msg: string) => {
            outputChannel.appendLine(msg);
        }
    );

    try {
        const urls = await newServer.start();
        server = newServer; // Only assign global server AFTER it has successfully started and has URLs

        outputChannel.appendLine(`✅ Server running!`);
        outputChannel.appendLine(`   Local:  ${urls.localUrl}`);
        outputChannel.appendLine(`   Secure: ${urls.secureUrl}`);

        // Store URLs for QR generation
        context.workspaceState.update('ag_urls', urls);

        updateStatusBar(true, port);

        // Auto-open QR code
        await showQR();
    } catch (e) {
        server = null;
        outputChannel.appendLine(`❌ Failed to start server: ${e}`);
        vscode.window.showErrorMessage(`Gravity Link failed to start: ${e}`);
        updateStatusBar(false);
    }
}

async function stopServer() {
    if (!server) {
        vscode.window.showInformationMessage("Gravity Link server is not running.");
        return;
    }

    try {
        server.stop();
        server = null;
        outputChannel.appendLine("🛑 Server stopped.");
        vscode.window.showInformationMessage("Gravity Link server stopped.");
        updateStatusBar(false);
    } catch (e) {
        vscode.window.showErrorMessage(`Failed to stop server: ${e}`);
    }
}

async function showQR() {
    if (!server) {
        const selection = await vscode.window.showWarningMessage("Server is not running.", "Start Server");
        if (selection === "Start Server") {
            await startServer(globalContext);
        }
        return;
    }

    try {
        const secureUrl = server.secureUrl;
        const localUrl = server.localUrl;
        const token = (server as any).token || '';
        const isTokenless = (server as any).isTokenless;

        console.log(`[Extension] showQR: secureUrl="${secureUrl}", localUrl="${localUrl}"`);
        outputChannel.appendLine(`[Extension] Generating QR for: ${secureUrl || localUrl}`);

        const displayUrl = secureUrl || localUrl;
        if (!displayUrl || displayUrl === 'https://:' || displayUrl === 'http://:') {
            vscode.window.showErrorMessage("No valid server URL available for QR generation. Please wait or restart the server.");
            return;
        }

        // Generate QR Data URL
        const qrDataUrl = await qrcode.toDataURL(displayUrl);

        // Create Webview Panel
        const panel = vscode.window.createWebviewPanel(
            'gravityLinkQR',
            'Gravity Link QR',
            vscode.ViewColumn.One,
            {}
        );

        const tokenDisplay = isTokenless
            ? `<p>Token: <span class="url">None (Tokenless)</span></p>`
            : `<p>Token: <span class="url">${token}</span></p>`;

        panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #1a1a1a; color: white; font-family: sans-serif; }
                    h1 { font-size: 1.5rem; margin-bottom: 20px; }
                    img { background: white; padding: 10px; border-radius: 8px; }
                    p { margin-top: 20px; opacity: 0.8; }
                    .url { font-family: monospace; background: #333; padding: 4px 8px; border-radius: 4px; }
                </style>
            </head>
            <body>
                <h1>📱 Scan to Connect</h1>
                <img src="${qrDataUrl}" width="300" height="300" />
                <p>Connect your mobile device to control Gravity.</p>
                <p>URL: <span class="url">${displayUrl}</span></p>
                ${tokenDisplay}
            </body>
            </html>
        `;

    } catch (e) {
        vscode.window.showErrorMessage(`Failed to generate QR: ${e}`);
    }
}

function updateStatusBar(running: boolean, port?: number) {
    if (running) {
        statusBarItem.text = `$(broadcast) Link: ${port}`;
        statusBarItem.tooltip = "Gravity Link Server Running - Click to Show QR";
        statusBarItem.command = "gravity-link.showQR";
        statusBarItem.show();
    } else {
        statusBarItem.text = `$(broadcast) Link: Off`;
        statusBarItem.tooltip = "Gravity Link Server Stopped - Click to Start";
        statusBarItem.command = "gravity-link.start";
        statusBarItem.show();
    }
}

export function deactivate() {
    if (server) {
        server.stop();
    }
}
