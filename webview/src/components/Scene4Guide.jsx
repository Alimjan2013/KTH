import React from "react";

export function Scene4Guide({ onBack }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
      <div>
        <p className="uppercase tracking-[0.3em] text-xs text-[var(--vscode-descriptionForeground)] mb-2">
          Scene 4 · Guided Build
        </p>
        <h1 className="text-3xl font-semibold text-[var(--vscode-foreground)]">
          Guided build flow coming soon
        </h1>
        <p className="text-[var(--vscode-descriptionForeground)] max-w-xl mx-auto mt-4">
          This next step will provide live checklists, code snippets, and Supabase helpers. For now, jump back to Scene 3 to keep iterating on the plan.
        </p>
      </div>
      <button
        onClick={onBack}
        className="px-6 py-3 rounded-lg bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:opacity-90 transition-opacity font-medium"
      >
        ← Back to Scene 3
      </button>
    </div>
  );
}


