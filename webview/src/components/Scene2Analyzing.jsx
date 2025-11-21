import React, { useEffect, useState, useMemo } from "react";
import { Streamdown } from "streamdown";

export function Scene2Analyzing({
  analysisSteps,
  analysisResult,
  onFeatureSelect,
}) {
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    // Show result when analysis is complete
    if (analysisResult) {
      setTimeout(() => setShowResult(true), 1000);
    }
  }, [analysisResult]);

  const mermaidConfig = {
    theme: "dark",
    themeVariables: {
      primaryColor: "#ff0000",
      primaryTextColor: "#fff",
    },
  };

  const markdownContent = useMemo(() => {
    if (!analysisResult) return "";

    // Use markdown directly from the analysis result
    // The markdown already includes description, features, and mermaid diagram
    return analysisResult.markdown || "";
  }, [analysisResult]);

  return (
    <div className="h-screen flex flex-col p-6 overflow-y-auto">
      {/* Analyzing Steps */}
      {!showResult && (
        <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full">
          <h2 className="text-2xl font-bold mb-6 text-[var(--vscode-foreground)]">
            Analyzing codebase...
          </h2>
          <div className="space-y-3">
            {analysisSteps.map((step, index) => {
              const isLastStep = index === analysisSteps.length - 1;
              const isCompleted =
                analysisResult && index < analysisSteps.length - 1;
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isCompleted || isLastStep
                      ? "bg-[var(--vscode-input-background)] text-[var(--vscode-foreground)]"
                      : "opacity-50 text-[var(--vscode-descriptionForeground)]"
                  }`}
                >
                  {isCompleted ? (
                    <span className="text-green-500">✓</span>
                  ) : isLastStep && !analysisResult ? (
                    <span className="animate-spin">⟳</span>
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-[var(--vscode-descriptionForeground)]"></span>
                  )}
                  <span>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analysis Result */}
      {showResult && analysisResult && (
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4 text-[var(--vscode-foreground)]">
              Analysis Complete
            </h2>
            {/* <div className="bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded-lg p-2 mb-4">
							<div className="text-[var(--vscode-foreground)]">
								
							</div>
						</div>  */}
            <Streamdown >
              {markdownContent}
            </Streamdown>
          </div>

          {/* Feature Selection */}
          <div className="mt-6">
            <p className="text-lg font-semibold mb-4 text-[var(--vscode-foreground)]">
              Do you want to add:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onFeatureSelect("Auth")}
                className="px-6 py-4 rounded-lg bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:opacity-90 transition-opacity font-medium"
              >
                Auth
              </button>
              <button
                onClick={() => onFeatureSelect("Database")}
                className="px-6 py-4 rounded-lg bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:opacity-90 transition-opacity font-medium"
              >
                Database
              </button>
              <button
                onClick={() => onFeatureSelect("Payment")}
                className="px-6 py-4 rounded-lg bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:opacity-90 transition-opacity font-medium"
              >
                Payment
              </button>
              <button
                onClick={() => onFeatureSelect("Storage")}
                className="px-6 py-4 rounded-lg bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:opacity-90 transition-opacity font-medium"
              >
                Storage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
