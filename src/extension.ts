import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    console.log('Vibe Architect is now active!');

    let currentPanel: vscode.WebviewPanel | undefined = undefined;

    let disposable = vscode.commands.registerCommand('vibe-architect.open', () => {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (currentPanel) {
            currentPanel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        currentPanel = vscode.window.createWebviewPanel(
            'vibeArchitect',
            'Vibe Architect',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'media'))
                ]
            }
        );

        // Set the webview's initial html content
        currentPanel.webview.html = getWebviewContent(currentPanel.webview, context.extensionPath);

        // Handle messages from the webview
        currentPanel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'ready':
                        await loadAndSendState(currentPanel, context);
                        return;
                    case 'saveFile':
                        await saveFile(message.filename, message.text);
                        return;
                    case 'openCopilot':
                        await vscode.commands.executeCommand('workbench.action.chat.open', { query: message.query });
                        return;
                    case 'askCopilot':
                        await handleAskCopilot(message.prompt);
                        return;
                }
            },
            undefined,
            context.subscriptions
        );

        // Watch for changes in copilot-instructions.md
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const instructionsPath = path.join(workspaceFolder, '.github', 'copilot-instructions.md');
            
            const watcher = vscode.workspace.createFileSystemWatcher(instructionsPath);
            watcher.onDidChange(async () => {
                if (currentPanel) {
                    await loadAndSendState(currentPanel, context);
                }
            });
            watcher.onDidCreate(async () => {
                if (currentPanel) {
                    await loadAndSendState(currentPanel, context);
                }
            });
            context.subscriptions.push(watcher);
        }

        currentPanel.onDidDispose(
            () => {
                currentPanel = undefined;
            },
            null,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);
}

async function loadAndSendState(panel: vscode.WebviewPanel | undefined, context: vscode.ExtensionContext) {
    if (!panel) return;
    
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const instructionsPath = path.join(workspaceFolder, '.github', 'copilot-instructions.md');
        
        if (fs.existsSync(instructionsPath)) {
            const content = fs.readFileSync(instructionsPath, 'utf8');
            panel.webview.postMessage({
                command: 'loadState',
                text: content
            });
        }
    }
}

function getWebviewContent(webview: vscode.Webview, extensionPath: string): string {
    const htmlPath = path.join(extensionPath, 'media', 'index.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // We don't strictly need to replace URIs if everything is inline, 
    // but if we had external CSS/JS files, we would do it here.
    // Since we kept everything in one file for simplicity, we just return it.
    // However, we might want to ensure CSP is correct if we were stricter.
    
    return htmlContent;
}

async function handleAskCopilot(userPrompt: string) {
    const systemInstructions = `
You are an AI assistant helping to modify a software architecture document.
The user wants to update the \`copilot-instructions.md\` file.

**CRITICAL: You MUST preserve the existing Markdown structure exactly so it can be parsed programmatically.**

**Structure Rules:**
1.  **Sections:** Keep \`## 1. ARCHITECTURE OVERVIEW\` and \`## 2. DATA FLOW & CONNECTIONS\`.
2.  **Nodes:** Use \`### [Name]\` for each component.
3.  **Properties:** Use \`- **Key:** Value\` (Keys: Type, Technology, Port, Description).
4.  **Routes:** Must be listed under \`- **API Routes / Endpoints:**\`.
    *   Format: \`  - **METHOD** \`/path\` - Description\`
5.  **Data Models:** Must be listed under \`- **Data Models / Schema:**\`.
    *   Table Format: \`  - **Table/Model: Name**\`
    *   Field Format: \`    - \`fieldName\` : type\`
6.  **Connections:** Must be listed under \`## 2. DATA FLOW & CONNECTIONS\`.
    *   Format: \`- **Source** (:Port) sends data to **Target** (:Port)\`

**User Request:**
${userPrompt}

**Action:**
Update the \`copilot-instructions.md\` file in the workspace to reflect the user's request while strictly adhering to the structure above.
`;

    await vscode.commands.executeCommand('workbench.action.chat.open', { query: systemInstructions });
}

async function saveFile(filename: string, content: string) {
    let fileUri: vscode.Uri | undefined;

    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        
        // Ensure .github directory exists if we are saving the instructions
        if (filename === 'copilot-instructions.md') {
            const githubDir = path.join(workspaceFolder, '.github');
            if (!fs.existsSync(githubDir)) {
                fs.mkdirSync(githubDir, { recursive: true });
            }
            fileUri = vscode.Uri.file(path.join(githubDir, filename));
        } else {
            fileUri = vscode.Uri.file(path.join(workspaceFolder, filename));
        }
    } else {
        // Fallback: Ask user where to save if no workspace is open
        fileUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(path.join(process.cwd(), filename)),
            saveLabel: 'Save Architecture Prompt'
        });
    }

    if (!fileUri) {
        return; // User cancelled dialog
    }

    try {
        fs.writeFileSync(fileUri.fsPath, content, 'utf8');
        vscode.window.showInformationMessage(`File saved: ${path.basename(fileUri.fsPath)}`);
        
        // Open the file
        const doc = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(doc);
        
    } catch (err: any) {
        vscode.window.showErrorMessage(`Error saving file: ${err.message}`);
    }
}

export function deactivate() {}
