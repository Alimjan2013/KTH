import React, { useMemo } from "react";
import { Streamdown } from "streamdown";

export function Scene3ImplementAuth({ analysisResult, onBack }) {
  const markdown = useMemo(() => analysisResult?.markdown ?? "", [analysisResult]);
  const features = Array.isArray(analysisResult?.features) ? analysisResult.features : [];

  return (
    <div className="h-screen flex flex-col p-6 overflow-y-auto gap-6">
      <header className="flex flex-col gap-2">
        <p className="uppercase tracking-[0.3em] text-xs text-[var(--vscode-descriptionForeground)]">
          Scene 3 · Feature Lab
        </p>
        <h1 className="text-3xl font-semibold text-[var(--vscode-foreground)]">
          Implement Auth for Your Project
        </h1>
        <p className="text-[var(--vscode-descriptionForeground)]">
          We pulled the latest analysis results so you can turn them into a real authentication scaffold without re-running the model.
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-1 bg-[var(--vscode-editor-background)] border border-[var(--vscode-input-border)] rounded-xl p-5 space-y-4">
          <h2 className="text-xl font-semibold text-[var(--vscode-foreground)]">Plan Overview</h2>
          <ol className="space-y-3 text-sm text-[var(--vscode-foreground)]">
            <li>
              <span className="font-bold">1.</span> Review the generated insights below. Identify entry points (APIs, pages, components) related to auth.
            </li>
            <li>
              <span className="font-bold">2.</span> Wire in your auth stack (NextAuth.js, Clerk, Supabase, etc.) using the structure the analysis highlighted.
            </li>
            <li>
              <span className="font-bold">3.</span> Update UI affordances (sign-in/out buttons, protected routes) referencing the files noted in the markdown.
            </li>
            <li>
              <span className="font-bold">4.</span> Run the code & smoke test sign-in/guarded pages before moving on.
            </li>
          </ol>
          <div className="border-t border-[var(--vscode-input-border)] pt-4 text-sm">
            <p className="font-semibold mb-1 text-[var(--vscode-foreground)]">Detected features</p>
            {features.length > 0 ? (
              <ul className="list-disc ml-5 space-y-1 text-[var(--vscode-descriptionForeground)]">
                {features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[var(--vscode-descriptionForeground)]">No feature metadata cached. Re-run analysis if needed.</p>
            )}
          </div>
          <button
            className="w-full px-4 py-2 rounded-md border border-[var(--vscode-button-border)] bg-transparent text-[var(--vscode-foreground)] hover:bg-[var(--vscode-input-background)] transition"
            onClick={onBack}
          >
            ← Back to Analysis
          </button>
        </div>

        <div className="col-span-2 bg-[var(--vscode-editor-background)] border border-[var(--vscode-input-border)] rounded-xl p-5 overflow-auto">
          <h2 className="text-xl font-semibold mb-4 text-[var(--vscode-foreground)]">Cached Analysis Reference</h2>
          {markdown ? (
            <div className="prose prose-invert max-w-none">
              <Streamdown>{markdown}</Streamdown>
            </div>
          ) : (
            <p className="text-[var(--vscode-descriptionForeground)]">
              No cached analysis result found. Return to Scene 2 to run the analysis once before implementing features.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}


