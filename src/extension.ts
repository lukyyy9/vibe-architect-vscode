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
                    case 'saveFile':
                        await saveFile(message.filename, message.text);
                        return;
                    case 'openCopilot':
                        await vscode.commands.executeCommand('workbench.action.chat.open', { query: message.query });
                        return;
                }
            },
            undefined,
            context.subscriptions
        );

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

function getWebviewContent(webview: vscode.Webview, extensionPath: string): string {
    const htmlPath = path.join(extensionPath, 'media', 'index.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // We don't strictly need to replace URIs if everything is inline, 
    // but if we had external CSS/JS files, we would do it here.
    // Since we kept everything in one file for simplicity, we just return it.
    // However, we might want to ensure CSP is correct if we were stricter.
    
    return htmlContent;
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
