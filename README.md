# Teach Me (KTH) – VS Code Extension

Teach Me is an experimental VS Code extension that walks you through an AI-guided project analysis flow and turns the result into step-by-step feature implementation scenes. Stage 1/2 of the analysis run in the extension host (with optional OpenAI tooling), while a React-based webview renders the “cinematic” experience inside a custom activity-bar view.

---

## 1. About the Extension

- **Conversational workflow** – a sidebar webview guides the user through Scene 1 (intro), Scene 2 (codebase analysis), and Scene 3 (feature implementation).
- **Two-stage analysis** – the extension reads your workspace tree, calls the configured OpenAI-compatible endpoint for deeper inspection, and caches both the detailed JSON and the polished markdown.
- **Feature scaffolding** – the current prototype focuses on the “Auth” path: once analysis finishes, users can jump into Scene 3 to review cached insights and wire up authentication without paying for more LLM calls.
- **Offline-friendly fallbacks** – when no API key is present or the cache already exists, the extension serves local markdown/mermaid output so you can keep iterating for free.

---

## 2. Project Structure

```
KTH/
├─ extension.js                # VS Code activation + view registration
├─ conversationProvider.js     # Webview provider, OpenAI orchestration, caching
├─ services/                   # Analysis pipeline, cache helpers, dir tree utilities
├─ media/                      # Bundled JS/CSS served directly to the webview
├─ webview/                    # React app (Vite + Tailwind) rendered inside the webview
│  ├─ src/components/Scene1Greeting.jsx
│  ├─ src/components/Scene2Analyzing.jsx
│  ├─ src/components/Scene3ImplementAuth.jsx
│  └─ src/hooks/useVSCodeMessaging.js
└─ prompts/, ui/, test/, etc.  # Prompt templates, HTML shell, extension tests
```

Key idea: everything under the project root runs in the VS Code extension host (Node context), while the `webview/` directory is a standalone React SPA that gets bundled and injected into the webview iframe.

---

## 3. Implementation & Setup

1. **Clone & install dependencies**
   ```bash
   cd /path/to/KTH
   pnpm install            # installs extension-host dependencies

   cd webview
   pnpm install            # installs React/Vite dependencies
   pnpm build              # produces media/webview.js + webview.css via Vite
   ```
   > The compiled assets land in `media/` and are loaded by `conversationProvider`.

2. **Provide an OpenAI-compatible API key (optional but recommended)**
   - Add `OPENAI_API_KEY=...` to the root workspace `.env` or export it in the shell before launching VS Code.
   - The extension also supports the `ai-gateway.vercel.sh` proxy configured in `conversationProvider`.

3. **Run the extension in VS Code**
   - Open the repository in VS Code.
   - Press `F5` (or run “Debug: Start Debugging”) to launch an Extension Development Host.
   - Open the “Teach Me” view from the activity bar to start the scene flow.

4. **Trigger analysis & scene routing**
   - Scene 1 → click “Start analyzing”.
   - Scene 2 → wait for the analysis; when finished, the “Auth” button becomes active. Other feature buttons look interactive but are intentionally disabled for now.
   - Scene 3 → review the cached markdown, follow the outlined implementation steps, or return to Scene 2 to re-run.

That’s it—after the first run, `.kth-analysis-cache.json` (Stage 1 data) and `.kth-analysis-result-cache.md` (Stage 2 markdown) let you revisit Scene 3 without incurring new model costs unless the codebase changes. Enjoy iterating! 
