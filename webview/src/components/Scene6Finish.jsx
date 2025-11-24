import React from 'react';

const BEFORE_IMAGE_URL = 'https://anki.is-ali.tech/kth-figure-1.png';
const AFTER_IMAGE_URL = 'https://anki.is-ali.tech/kth-figure-2.png';

export function Scene6Finish({ onRestart }) {
  return (
    <div className="h-screen flex flex-col p-6 overflow-y-auto gap-6">
      <header className="space-y-3">
        <p className="text-4xl">🎉</p>
        <h1 className="text-3xl font-semibold text-(--vscode-foreground)">
          Auth flow complete!
        </h1>
        <p className="text-(--vscode-descriptionForeground) max-w-3xl">
          You wired up Supabase authentication end-to-end. The prototype now blocks unauthenticated users,
          refreshes sessions, and provides working sign-up / sign-in UI.
        </p>
      </header>

      <section className="bg-(--vscode-editor-background) border border-(--vscode-input-border) rounded-xl p-5 space-y-4">
        <h2 className="text-xl font-semibold text-(--vscode-foreground)">Architecture shift</h2>
        <p className="text-(--vscode-descriptionForeground)">
          The prototype evolved from an open gallery into an auth-aware experience. Here’s what changed visually:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <figure className="space-y-2">
            <figcaption className="text-sm uppercase tracking-wide text-(--vscode-descriptionForeground)">From this</figcaption>
            <img
              src={BEFORE_IMAGE_URL}
              alt="Previous gallery architecture without auth"
              className="w-full rounded-lg border border-(--vscode-input-border)"
            />
          </figure>
          <figure className="space-y-2">
            <figcaption className="text-sm uppercase tracking-wide text-(--vscode-descriptionForeground)">To this</figcaption>
            <img
              src={AFTER_IMAGE_URL}
              alt="Updated gallery architecture with Supabase auth"
              className="w-full rounded-lg border border-(--vscode-input-border)"
            />
          </figure>
        </div>
      </section>

      <section className="bg-(--vscode-editor-background) border border-(--vscode-input-border) rounded-xl p-5 space-y-4">
        <h2 className="text-xl font-semibold text-(--vscode-foreground)">What you just shipped</h2>
        <ol className="list-decimal pl-6 space-y-3 text-(--vscode-descriptionForeground)">
          <li>
            <span className="text-(--vscode-foreground) font-medium">Analyzed the current codebase</span>
            <p className="text-sm">Mapped the architecture and surfaced Auth as the focus area.</p>
          </li>
          <li>
            <span className="text-(--vscode-foreground) font-medium">Required and implemented Supabase clients</span>
            <p className="text-sm">Created cookie-aware browser and server helpers to reuse everywhere.</p>
          </li>
          <li>
            <span className="text-(--vscode-foreground) font-medium">Built signup & login UI</span>
            <p className="text-sm">Delivered polished placeholder screens under <code>/auth/*</code>.</p>
          </li>
          <li>
            <span className="text-(--vscode-foreground) font-medium">Hooked the UI up to Supabase</span>
            <p className="text-sm">Swapped in Server Actions that call <code>supabase.auth.signUp</code> and <code>signInWithPassword</code>.</p>
          </li>
          <li>
            <span className="text-(--vscode-foreground) font-medium">Protected every private route</span>
            <p className="text-sm">Middleware now blocks anything outside <code>/</code> and <code>/auth/*</code> unless a session is present.</p>
          </li>
        </ol>
      </section>

      <div className="flex justify-between mt-auto">
        <button
          onClick={onRestart}
          className="px-4 py-2 rounded-md border border-(--vscode-button-border) bg-transparent text-(--vscode-foreground) hover:bg-(--vscode-input-background) transition"
        >
          ↻ Run analysis again
        </button>
      </div>
    </div>
  );
}

