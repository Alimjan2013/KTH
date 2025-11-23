import React, { useState, useEffect } from "react";

const SUPABASE_API_KEYS_URL =
  "https://supabase.com/dashboard/project/pwlhevjeddeyfdevhlfu/settings/api-keys/new";
const SUPABASE_PROJECT_URL = "https://supabase.com/dashboard/project/pwlhevjeddeyfdevhlfu/settings/api";

export function Scene4Guide({ 
  onBack, 
  openExternalUrl,
  envLocalStatus,
  checkEnvLocal,
  validateEnvLocal,
  openEnvLocal,
  packageStatus,
  checkSupabasePackages
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [step3Checked, setStep3Checked] = useState(false);

  useEffect(() => {
    if (currentStep === 2) {
      // Open .env.local file for user to edit
      openEnvLocal?.();
    }
    if (currentStep === 3) {
      // Reset step3Checked when entering step 3
      setStep3Checked(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const handleFindProjectUrl = () => {
    openExternalUrl?.(SUPABASE_PROJECT_URL);
    // Stay in step 1, don't auto-advance
  };

  const handleFinished = () => {
    validateEnvLocal();
  };

  const handleStep3Finished = () => {
    setStep3Checked(true);
    checkSupabasePackages();
  };

  useEffect(() => {
    if (envLocalStatus.valid === true) {
      setCurrentStep(3);
    }
  }, [envLocalStatus.valid]);

  return (
    <div className="h-screen flex flex-col p-2 overflow-y-auto gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-(--vscode-foreground)">
          Step-by-Step Supabase Auth Integration
        </h1>
        <p className="text-(--vscode-descriptionForeground) max-w-3xl">
          Follow these steps to integrate Supabase authentication into your project.
        </p>
      </header>

      {/* Step 1 */}
      {currentStep === 1 && (
        <section className="bg-(--vscode-editor-background) border border-(--vscode-input-border) rounded-xl p-2 space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-6 h-6 rounded-full bg-(--vscode-button-background) text-(--vscode-button-foreground) flex items-center justify-center font-bold">
                1
              </div>
              <h4 className="flex-1 text-base font-semibold text-(--vscode-foreground)">
                First, acquire Publishable API key from Supabase
              </h4>
            </div>

            <p className="text-(--vscode-descriptionForeground) w-full">
              You need to get your Supabase API keys from the dashboard. Click the button below to open the Supabase API keys page.
            </p>
            <button
              onClick={() => openExternalUrl?.(SUPABASE_API_KEYS_URL)}
              className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium"
            >
              Find Publishable API key
            </button>

            <button
              onClick={handleFindProjectUrl}
              className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium"
            >
              Find project URL
            </button>

            <button
              onClick={() => setCurrentStep(2)}
              className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium"
            >
              Continue to Step 2
            </button>
          </div>
        </section>
      )}

      {/* Step 2 */}
      {currentStep === 2 && (
        <section className="bg-(--vscode-editor-background) border border-(--vscode-input-border) rounded-xl p-2 space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-6 h-6 rounded-full bg-(--vscode-button-background) text-(--vscode-button-foreground) flex items-center justify-center font-bold">
                2
              </div>
              <h4 className="flex-1 text-base font-semibold text-(--vscode-foreground)">
                Declare Supabase Environment Variables in .env.local file
              </h4>
            </div>

            <p className="text-(--vscode-descriptionForeground) w-full">
              The .env.local file has been opened for you. Please add your Supabase URL and Publishable Key:
            </p>

            <div className="space-y-1 text-(--vscode-foreground) w-full ">
              <div>
                <p className="bg-(--vscode-input-background) px-1 py-1 rounded break-all text-sm">NEXT_PUBLIC_SUPABASE_URL=</p>
              </div>
              <div>
                <p className="bg-(--vscode-input-background) px-1 py-1 rounded break-all text-sm">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=</p>
              </div>
            </div>

            <button
              onClick={handleFinished}
              className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium"
            >
              I finished
            </button>

            {envLocalStatus.validationErrors && (
              <div className="p-3 bg-(--vscode-input-background) border border-red-500 rounded text-sm text-red-400">
                {Array.isArray(envLocalStatus.validationErrors) 
                  ? envLocalStatus.validationErrors.map((err, i) => <div key={i}>{err}</div>)
                  : envLocalStatus.validationErrors}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Step 3 */}
      {currentStep === 3 && (
        <section className="bg-(--vscode-editor-background) border border-(--vscode-input-border) rounded-xl p-2 space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-6 h-6 rounded-full bg-(--vscode-button-background) text-(--vscode-button-foreground) flex items-center justify-center font-bold">
                3
              </div>
              <h4 className="flex-1 text-base font-semibold text-(--vscode-foreground)">
                Install
              </h4>
            </div>

            <p className="text-(--vscode-descriptionForeground) w-full">
              Install the @supabase/supabase-js and @supabase/ssr helper packages: 
            </p>

            <div className="bg-(--vscode-input-background) px-2 py-2 rounded text-sm text-(--vscode-foreground) font-mono">
              pnpm add @supabase/supabase-js @supabase/ssr
            </div>

            <p className="text-(--vscode-descriptionForeground) w-full">To use Server-Side Rendering (SSR) with Supabase, you need to configure your Supabase client to use cookies. The @supabase/ssr package helps you do this for your applications.</p>

            <button
              onClick={handleStep3Finished}
              className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium"
            >
              I finished
            </button>

            {step3Checked && packageStatus.loading && (
              <p className="text-sm text-(--vscode-descriptionForeground)">Checking package.json...</p>
            )}

            {step3Checked && !packageStatus.loading && packageStatus.installed && (
              <div className="p-3 bg-green-500/20 border border-green-500 rounded text-sm text-green-400">
                ✓ Packages installed successfully!
              </div>
            )}

            {step3Checked && !packageStatus.loading && !packageStatus.installed && packageStatus.hasSupabaseJs !== undefined && (
              <div className="p-3 bg-(--vscode-input-background) border border-red-500 rounded text-sm text-red-400">
                {packageStatus.error || (
                  <>
                    Missing packages:
                    {!packageStatus.hasSupabaseJs && <div>• @supabase/supabase-js</div>}
                    {!packageStatus.hasSupabaseSsr && <div>• @supabase/ssr</div>}
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-md border border-(--vscode-button-border) bg-transparent text-(--vscode-foreground) hover:bg-(--vscode-input-background) transition"
        >
          ← Back to Scene 3
        </button>
      </div>
    </div>
  );
}
