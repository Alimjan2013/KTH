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
        <p className="uppercase tracking-[0.3em] text-xs text-(--vscode-descriptionForeground)">
          Scene 3 · Feature Lab
        </p>
        <h1 className="text-3xl font-semibold text-(--vscode-foreground)">
          Let’s add Auth based on Supabase
        </h1>
        <p className="text-(--vscode-descriptionForeground) max-w-3xl">
          Review the current architecture, visualize how Supabase authentication fits in, and capture the concrete code edits before jumping into the guided build.
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-1 bg-(--vscode-editor-background) border border-(--vscode-input-border) rounded-xl p-5 space-y-4">
          <h2 className="text-xl font-semibold text-(--vscode-foreground)">Plan Overview</h2>
          <ol className="space-y-3 text-sm text-(--vscode-foreground)">
            <li>
              <span className="font-bold">1.</span> Snapshot the current architecture placeholder for context.
            </li>
            <li>
              <span className="font-bold">2.</span> Compare with the Supabase-enhanced storyboard.
            </li>
            <li>
              <span className="font-bold">3.</span> Apply the code changes list before moving to the guide.
            </li>
          </ol>
          <div className="border-t border-(--vscode-input-border) pt-4 text-sm">
            <p className="font-semibold mb-1 text-(--vscode-foreground)">Detected features</p>
            {features.length > 0 ? (
              <ul className="list-disc ml-5 space-y-1 text-(--vscode-descriptionForeground)">
                {features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            ) : (
              <p className="text-(--vscode-descriptionForeground)">No feature metadata cached. Re-run analysis if needed.</p>
            )}
          </div>
        </div>

        <div className="col-span-2 bg-(--vscode-editor-background) border border-(--vscode-input-border) rounded-xl p-5 space-y-4">
          <h2 className="text-xl font-semibold text-(--vscode-foreground)">Current snapshot (cached)</h2>
          <img
            src={ANALYSIS_PLACEHOLDER_IMAGE_URL}
            alt="Architecture placeholder"
            className="w-full rounded-lg border border-(--vscode-input-border)"
          />
          <p className="text-sm text-(--vscode-descriptionForeground)">
            This placeholder image represents the high-level architecture captured during analysis.
          </p>
        </div>
      </section>

      <section className="bg-(--vscode-editor-background) border border-(--vscode-input-border) rounded-xl p-5 space-y-4">
        <h2 className="text-xl font-semibold text-(--vscode-foreground)">Cached analysis reference</h2>
        {markdown ? (
          <div className="prose prose-invert max-w-none">
            <Streamdown>{markdown}</Streamdown>
          </div>
        ) : (
          <p className="text-(--vscode-descriptionForeground)">No cached analysis result found.</p>
        )}
      </section>

      <section className="bg-(--vscode-editor-background) border border-(--vscode-input-border) rounded-xl p-5 space-y-4">
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
        <p className="text-sm text-(--vscode-descriptionForeground)">
          Visual placeholder only; follow the instructions below for actual code changes.
        </p>
      </section>

      <section className="bg-(--vscode-editor-background) border border-(--vscode-input-border) rounded-xl p-5 space-y-4">
        <h2 className="text-xl font-semibold text-(--vscode-foreground)">What will change in code</h2>
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


