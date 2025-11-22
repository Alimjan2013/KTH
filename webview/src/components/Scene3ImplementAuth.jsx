import React, { useEffect, useMemo } from "react";
import { Streamdown } from "streamdown";

const ANALYSIS_PLACEHOLDER_IMAGE_URL =
  "https://anki.is-ali.tech/kth-figure-1.png";
const AUTH_PLACEHOLDER_IMAGE_URL =
  "https://anki.is-ali.tech/kth-figure-2.png";

export function Scene3ImplementAuth({
  analysisResult,
  authPlan,
  onBack,
  onGuide,
  onRequestPlan,
}) {
  const markdown = useMemo(() => analysisResult?.markdown ?? "", [analysisResult]);
  const features = Array.isArray(analysisResult?.features) ? analysisResult.features : [];

  useEffect(() => {
    if (analysisResult && onRequestPlan && !authPlan?.changeMarkdown && !authPlan?.loading) {
      onRequestPlan();
    }
  }, [analysisResult, authPlan?.changeMarkdown, authPlan?.loading, onRequestPlan]);

  return (
    <div className="h-screen flex flex-col p-6 overflow-y-auto gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-(--vscode-foreground)">
          Let’s add Auth based on Supabase
        </h1>
        <p className="text-(--vscode-descriptionForeground) max-w-3xl">
          Review the current architecture, visualize how Supabase authentication fits in, and capture the concrete code edits before jumping into the guided build.
        </p>
      </header>

      <section className="bg-(--vscode-editor-background)  space-y-4">
      <h3 className="text-lg font-semibold text-(--vscode-foreground)">Before adding auth</h3>
              <img
                src={ANALYSIS_PLACEHOLDER_IMAGE_URL}
                alt="Architecture placeholder"
                className="w-full"
              />
      </section>

      <section className="bg-(--vscode-editor-background)  space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-(--vscode-foreground)">After adding auth</h2>
          {authPlan?.loading && (
            <span className="text-xs uppercase tracking-[0.2em] text-(--vscode-descriptionForeground)">
              Generating…
            </span>
          )}
        </div>
        <img
          src={authPlan?.diagramImageUrl || AUTH_PLACEHOLDER_IMAGE_URL}
          alt="Supabase auth storyboard placeholder"
          className="w-full rounded-lg border border-(--vscode-input-border) bg-white"
        />
      </section>

      <section className="bg-(--vscode-editor-background) space-y-4">
        {authPlan?.changeMarkdown ? (
          <div className="prose prose-invert max-w-none">
            <Streamdown>{authPlan.changeMarkdown}</Streamdown>
          </div>
        ) : (
          <p className="text-(--vscode-descriptionForeground)">No implementation notes yet.</p>
        )}
      </section>

      <div className="flex flex-wrap gap-3 justify-between">
        <button
          className="px-4 py-2 rounded-md border border-(--vscode-button-border) bg-transparent text-(--vscode-foreground) hover:bg-(--vscode-input-background) transition"
          onClick={onBack}
        >
          ← Back to Analysis
        </button>
        <div className="flex gap-3">
          <button
            className="px-4 py-2 rounded-md bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition"
            onClick={onGuide}
          >
            Guide →
          </button>
        </div>
      </div>
    </div>
  );
}


