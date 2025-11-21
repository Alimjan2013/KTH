import React, { useEffect, useState, useMemo } from "react";
import { Streamdown } from "streamdown";

export function Scene2Analyzing({
  analysisSteps,
  analysisResult,
  onFeatureSelect,
  selectedFeature,
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
          <FeatureSelection
            analysisReady={!!analysisResult}
            onFeatureSelect={onFeatureSelect}
            selectedFeature={selectedFeature}
          />
        </div>
      )}
    </div>
  );
}

function FeatureSelection({ analysisReady, onFeatureSelect, selectedFeature }) {
  const features = [
    { key: "Auth", label: "Auth", enabled: true, description: "Implement auth flow" },
    { key: "Database", label: "Database", enabled: false, description: "Coming soon" },
    { key: "Payment", label: "Payment", enabled: false, description: "Coming soon" },
    { key: "Storage", label: "Storage", enabled: false, description: "Coming soon" },
  ];

  return (
    <div className="mt-6">
      <p className="text-lg font-semibold mb-4 text-[var(--vscode-foreground)]">
        Choose the next feature to implement:
      </p>
      <div className="grid grid-cols-2 gap-3">
        {features.map((feature) => {
          const isDisabled = !analysisReady || !feature.enabled;
          const isSelected = selectedFeature === feature.key;
          return (
            <button
              key={feature.key}
              onClick={() => !isDisabled && onFeatureSelect(feature.key)}
              disabled={isDisabled}
              className={`px-6 py-4 rounded-lg transition-all font-medium border ${
                isDisabled
                  ? "bg-[var(--vscode-input-background)] text-[color-mix(in srgb, var(--vscode-foreground) 60%, transparent)] border-transparent cursor-not-allowed"
                  : "bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:opacity-90 cursor-pointer"
              } ${isSelected ? "ring-2 ring-[var(--vscode-focusBorder)]" : ""}`}
              aria-disabled={isDisabled}
              title={feature.description}
            >
              {feature.label}
              {feature.key === "Auth" && !isDisabled && (
                <span className="block text-xs text-[var(--vscode-descriptionForeground)] mt-1">
                  {isSelected ? "Selected" : "Ready"}
                </span>
              )}
              {feature.key !== "Auth" && (
                <span className="block text-xs text-[var(--vscode-descriptionForeground)] mt-1">
                  Coming soon
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
