# Vibe Architect

<div align="center">
  <img src="logo.png" alt="Vibe Architect Logo" width="128"/>
  <br>
  <h1>Vibe Architect</h1>
  <b>Visual Software Architecture Designer for AI Agents</b>
</div>

<br>

**Vibe Architect** is a powerful VS Code extension that allows you to visually design your software architecture and automatically generate detailed prompts for AI coding agents (like GitHub Copilot, Claude, or ChatGPT).

Stop writing long, complex prompts manually. Draw your architecture, configure your components, and let Vibe Architect generate the perfect context for your AI to build your application.

## Features

### 🎨 Visual Designer

Drag-and-drop interface to create architecture diagrams effortlessly. Visualize your entire stack in one view.

### 🧩 Component Library

Ready-to-use components for:

- **Frontend Apps** (React, Vue, etc.)
- **Backend APIs** (Node, Python, Go, etc.)
- **Databases** (SQL, NoSQL)
- **Cloud Services** (Redis, AWS, Azure)
- **Generic Blocks** for custom needs

### ⚙️ Detailed Configuration

Select any component to configure its properties:

- **Tech Stack & Ports**: Define exactly what technologies to use.
- **Database Schemas**: Visually design tables and fields.
- **API Routes**: Define endpoints and methods (GET, POST, etc.).

### 🤖 AI Prompt Generation

One-click export to a comprehensive Markdown prompt (`copilot-instructions.md`) optimized for AI agents. This prompt includes:

- Project Context & Goals
- Visual Style Guidelines
- Architecture Overview
- Data Models & Schemas
- API Specifications
- Step-by-step Implementation Plan

### ✨ Style Presets

Choose from predefined UI styles to guide the AI on the frontend look and feel:

- **Premium SaaS** (Minimalist, Swiss Design)
- **Futuristic Glassmorphism** (Dark mode, gradients)
- **Bento Grid** (Apple-style, modular)
- **Pop Neo-Brutalism** (High contrast, bold)

## How to Use

1. **Open the Designer**:
   - Open the Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`).
   - Run the command `Vibe Architect: Open`.

2. **Design Your App**:
   - **Drag & Drop** components from the sidebar onto the canvas.
   - **Connect** components by dragging from an output port (right) to an input port (left).
   - **Select** a component to edit its properties in the right panel.

3. **Define Details**:
   - Add **Database Tables** and fields for your database nodes.
   - Define **API Routes** and endpoints for your backend nodes.
   - Select a **Visual Style** for your project in the sidebar.

4. **Generate & Build**:
   - Click the **"Generate App"** button.
   - A `copilot-instructions.md` file will be generated in your workspace.
   - Open **GitHub Copilot Chat** (or your preferred AI agent) and reference this file (or paste its content) with the command: *"Build the app based on these instructions."*

## Requirements

- VS Code 1.80.0 or higher.

## Extension Settings

This extension does not currently contribute any settings to VS Code.

## Known Issues

- Ensure you have an open workspace/folder to save the generated prompt file.

## Release Notes

### 0.0.1

- Initial release of Vibe Architect.
- Visual designer with drag-and-drop.
- AI Prompt export feature.

---

**Enjoy building with Vibe Architect!**
