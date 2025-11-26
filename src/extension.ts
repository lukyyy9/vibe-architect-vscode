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
3.  **Properties:** Use \`- **Key:** Value\` (Keys: Type (frontend,backend,database,cloud,custom), Technology, Port, Description).
4.  **Routes:** Must be listed under \`- **API Routes / Endpoints:**\`.
    *   Format: \`  - **METHOD(GET,POST,PUT,PATCH,DELETE,CRUD)** \`/path\` - Description\`
5.  **Data Models:** Must be listed under \`- **Data Models / Schema:**\`.
    *   Table Format: \`  - **Table/Model: Name**\`
    *   Field Format: \`    - \`fieldName\` : type(string,number,boolean,array,object,pk,fk,date)\`
6.  **Connections:** Must be listed under \`## 2. DATA FLOW & CONNECTIONS\`.
    *   Format: \`- **Source** (:Port) sends data to **Target** (:Port)\`

If the file is empty or does not exist, create it with the following example structure in mind, without changing the LLM instructions, and only modifying the actual architecture-related and app-related data : [

# SYSTEM ARCHITECTURE SPECIFICATION
> **Project Context / Goal:**
> Students meeting app

> **Visual Style:** Futuristic Glassmorphism
> *Dark Mode app interface using 'Glassmorphism' style. Translucent cards and panels with background blur effect. Very dark background. Modern bright white typography. Diffuse glow effect around interactive elements. Frosted texture, premium and technological look. Dribbble top trend style render. Use clean font-awesome icons.*

## 1. ARCHITECTURE OVERVIEW

### [WebApp]
- **Type:** frontend
- **Technology:** React/Vite
- **Port:** 3000
- **API Routes / Endpoints:**
  - **GET** \`/\` - Home Page
  - **GET** \`/dashboard\` - Dashboard
### [Backend]
- **Type:** backend
- **Technology:** Node.js/Express
- **Port:** 8080
- **API Routes / Endpoints:**
  - **GET** \`/api/health\` - Health check
  - **CRUD** \`/api/users\` - User List
### [Main DB]
- **Type:** database
- **Technology:** PostgreSQL
- **Port:** 5432
- **Data Models / Schema:**
  - **Table/Model: Users**
    - \`id\` : pk
    - \`email\` : string

## 2. DATA FLOW & CONNECTIONS

- **WebApp** (:3000) sends data to **Backend** (:8080)
- **Backend** (:8080) sends data to **Main DB** (:5432)

## 3. INSTRUCTIONS
Act as a Senior Software Architect. Based on the structure above, please generate:
1. The project file structure.
2. The necessary configuration files (Language/framework related configuration files (like package.json, composer.json, pom.xml...), Dockerfile(s), docker-compose.yml).
   *Please ensure docker-compose ports match the specified ports above.*
3. The complete, production-ready source code for all components. **STRICTLY FORBIDDEN:** usage of comments like \`// TODO\`, \`// Mock\`, \`// Implement later\`, or placeholder logic. You must implement FULL logic for every function. Authentication must be real (JWT/Session with DB check), database connections must be real (no in-memory arrays), and error handling must be implemented. The entire procedure will fail if any part is missing or incomplete.
4. **IMPORTANT:** Generate the specific SQL schemas as defined in the Data Models section above.
5. **IMPORTANT:** Implement the API routes/endpoints exactly as specified above, with proper request/response handling.
Then, explain what the steps a developer should take next to start the development process based on this architecture.
]

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
