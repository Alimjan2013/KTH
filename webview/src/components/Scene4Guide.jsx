import React, { useState, useEffect } from "react";

const SUPABASE_API_KEYS_URL =
  "https://supabase.com/dashboard/project/pwlhevjeddeyfdevhlfu/settings/api-keys/new";
const SUPABASE_PROJECT_URL = "https://supabase.com/dashboard/project/pwlhevjeddeyfdevhlfu/settings/api";

const CLIENT_CODE = `import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}`;

const SERVER_CODE = `import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value }) => cookieStore.set(name, value))
          } catch {
            // The \`setAll\` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}`;

const MIDDLEWARE_CODE = `import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value }) => supabaseResponse.cookies.set(name, value))
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()

  const user = data?.claims

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}`;

export function Scene4Guide({ 
  onBack, 
  onNext,
  openExternalUrl,
  envLocalStatus,
  checkEnvLocal,
  validateEnvLocal,
  openEnvLocal,
  packageStatus,
  checkSupabasePackages,
  createFile,
  checkFileExists,
  checkFileNotEmpty,
  fileStatus
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [step3Checked, setStep3Checked] = useState(false);

  const [step4Checked, setStep4Checked] = useState(false);
  const [step5Checked, setStep5Checked] = useState(false);

  // Add ref for scrolling
  const containerRef = React.useRef(null);

  // Scroll to top when step changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === 2) {
      // Open .env.local file for user to edit
      openEnvLocal?.();
    }
    if (currentStep === 3) {
      // Reset step3Checked when entering step 3
      setStep3Checked(false);
    }
    if (currentStep === 4) {
      // Check if files exist when entering step 4
      checkFileExists?.('utils/supabase/client.ts');
      checkFileExists?.('utils/supabase/server.ts');
      setStep4Checked(false);
    }
    if (currentStep === 5) {
      // Check if middleware file exists
      checkFileExists?.('utils/supabase/middleware.ts');
      setStep5Checked(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Auto-advance to Step 4 on success
  useEffect(() => {
    if (step3Checked && packageStatus.installed) {
      const timer = setTimeout(() => {
        setCurrentStep(4);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step3Checked, packageStatus.installed]);

  // Auto-advance to Step 5 on success
  useEffect(() => {
    if (step4Checked && fileStatus.clientExists && fileStatus.serverExists && fileStatus.clientNotEmpty && fileStatus.serverNotEmpty) {
      const timer = setTimeout(() => {
        setCurrentStep(5);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step4Checked, fileStatus]);

  // Auto-advance to Scene 5 on success
  useEffect(() => {
    if (step5Checked && fileStatus.middlewareExists && fileStatus.middlewareNotEmpty) {
      const timer = setTimeout(() => {
        onNext();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step5Checked, fileStatus, onNext]);

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

  const handleStep4Finished = () => {
    setStep4Checked(true);
    checkFileExists?.('utils/supabase/client.ts');
    checkFileExists?.('utils/supabase/server.ts');
    // Also check if files are empty
    if (checkFileNotEmpty) {
      checkFileNotEmpty('utils/supabase/client.ts');
      checkFileNotEmpty('utils/supabase/server.ts');
    }
  };

  const handleStep5Finished = () => {
    // Logic for finishing step 5 (middleware)
    setStep5Checked(true);
    checkFileExists?.('utils/supabase/middleware.ts');
    if (checkFileNotEmpty) {
      checkFileNotEmpty('utils/supabase/middleware.ts');
    }
  };

  const handleCreateClientFile = () => {
    // Send empty content for empty file creation
    createFile('utils/supabase/client.ts', '');
  };

  const handleCreateServerFile = () => {
    // Send empty content for empty file creation
    createFile('utils/supabase/server.ts', '');
  };

  const handleCreateMiddlewareFile = () => {
    createFile('utils/supabase/middleware.ts', '');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    if (envLocalStatus.valid === true) {
      setCurrentStep(3);
    }
  }, [envLocalStatus.valid]);

  return (
    <div ref={containerRef} className="h-screen flex flex-col p-2 overflow-y-auto gap-6">
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

      {/* Step 4 */}
      {currentStep === 4 && (
        <section className="bg-(--vscode-editor-background) border border-(--vscode-input-border) rounded-xl p-2 space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-6 h-6 rounded-full bg-(--vscode-button-background) text-(--vscode-button-foreground) flex items-center justify-center font-bold">
                4
              </div>
              <h4 className="flex-1 text-base font-semibold text-(--vscode-foreground)">
                Create a client
              </h4>
            </div>

            <p className="text-(--vscode-descriptionForeground) w-full">
              You need setup code to configure a Supabase client to use cookies. Once you have the utility code, you can use the createClient utility functions to get a properly configured Supabase client.
            </p>
            
            <p className="text-(--vscode-descriptionForeground) w-full">
              Use the browser client in code that runs on the browser, and the server client in code that runs on the server.
            </p>

            {/* Client Creation Section */}
            <div className="space-y-2">
              <button
                onClick={handleCreateClientFile}
                disabled={fileStatus?.creatingClient || fileStatus?.clientExists}
                className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
              >
                {fileStatus?.clientExists ? '✓ client.ts created' : 'Create client.ts'}
              </button>
              
              <div className="relative bg-(--vscode-input-background) p-3 rounded text-sm font-mono text-(--vscode-foreground) overflow-x-auto">
                <button 
                  onClick={() => copyToClipboard(CLIENT_CODE)}
                  className="absolute top-2 right-2 p-1 rounded hover:bg-(--vscode-editor-background) text-(--vscode-descriptionForeground)"
                  title="Copy to clipboard"
                >
                  📋
                </button>
                <pre>{CLIENT_CODE}</pre>
              </div>
              <p className="text-xs text-(--vscode-descriptionForeground)">
                Creates: utils/supabase/client.ts
              </p>
            </div>

            {/* Server Creation Section */}
            <div className="space-y-2 pt-4 border-t border-(--vscode-input-border)">
              <button
                onClick={handleCreateServerFile}
                disabled={fileStatus?.creatingServer || fileStatus?.serverExists}
                className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
              >
                 {fileStatus?.serverExists ? '✓ server.ts created' : 'Create server.ts'}
              </button>
              
              <div className="relative bg-(--vscode-input-background) p-3 rounded text-sm font-mono text-(--vscode-foreground) overflow-x-auto">
                <button 
                  onClick={() => copyToClipboard(SERVER_CODE)}
                  className="absolute top-2 right-2 p-1 rounded hover:bg-(--vscode-editor-background) text-(--vscode-descriptionForeground)"
                  title="Copy to clipboard"
                >
                  📋
                </button>
                <pre>{SERVER_CODE}</pre>
              </div>
              <p className="text-xs text-(--vscode-descriptionForeground)">
                Creates: utils/supabase/server.ts
              </p>
            </div>

            <button
              onClick={handleStep4Finished}
              className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium mt-4"
            >
              I finished
            </button>

            {step4Checked && (!fileStatus.clientExists || !fileStatus.serverExists) && (
              <div className="p-3 bg-(--vscode-input-background) border border-red-500 rounded text-sm text-red-400">
                Please create both client.ts and server.ts files.
              </div>
            )}

            {step4Checked && fileStatus.clientExists && fileStatus.serverExists && (!fileStatus.clientNotEmpty || !fileStatus.serverNotEmpty) && (
              <div className="p-3 bg-(--vscode-input-background) border border-red-500 rounded text-sm text-red-400">
                Files exist but appear to be empty. Please paste the code into the files and save.
              </div>
            )}

            {step4Checked && fileStatus.clientExists && fileStatus.serverExists && fileStatus.clientNotEmpty && fileStatus.serverNotEmpty && (
              <div className="p-3 bg-green-500/20 border border-green-500 rounded text-sm text-green-400">
                ✓ Files created and populated!
              </div>
            )}

          </div>
        </section>
      )}

      {/* Step 5 */}
      {currentStep === 5 && (
        <section className="bg-(--vscode-editor-background) border border-(--vscode-input-border) rounded-xl p-2 space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-6 h-6 rounded-full bg-(--vscode-button-background) text-(--vscode-button-foreground) flex items-center justify-center font-bold">
                5
              </div>
              <h4 className="flex-1 text-base font-semibold text-(--vscode-foreground)">
                Hook up middleware
              </h4>
            </div>

            <div className="space-y-3 text-(--vscode-descriptionForeground) text-sm">
              <p>
                Since Next.js Server Components can't write cookies, you need middleware to refresh expired Auth tokens and store them.
              </p>
              <p>The middleware is responsible for:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Refreshing the Auth token by calling <code>supabase.auth.getClaims()</code>.</li>
                <li>Passing the refreshed Auth token to Server Components using <code>request.cookies.set</code>.</li>
                <li>Passing the refreshed Auth token to the browser using <code>response.cookies.set</code>.</li>
              </ul>
            </div>

            {/* Middleware Creation Section */}
            <div className="space-y-2">
              <button
                onClick={handleCreateMiddlewareFile}
                disabled={fileStatus?.creatingMiddleware || fileStatus?.middlewareExists}
                className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
              >
                {fileStatus?.middlewareExists ? '✓ middleware.ts created' : 'Create middleware.ts'}
              </button>
              
              <div className="relative bg-(--vscode-input-background) p-3 rounded text-sm font-mono text-(--vscode-foreground) overflow-x-auto">
                <button 
                  onClick={() => copyToClipboard(MIDDLEWARE_CODE)}
                  className="absolute top-2 right-2 p-1 rounded hover:bg-(--vscode-editor-background) text-(--vscode-descriptionForeground)"
                  title="Copy to clipboard"
                >
                  📋
                </button>
                <pre>{MIDDLEWARE_CODE}</pre>
              </div>
              <p className="text-xs text-(--vscode-descriptionForeground)">
                Creates: utils/supabase/middleware.ts
              </p>
            </div>

            <button
              onClick={handleStep5Finished}
              className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium mt-4"
            >
              I finished
            </button>

            {step5Checked && !fileStatus.middlewareExists && (
              <div className="p-3 bg-(--vscode-input-background) border border-red-500 rounded text-sm text-red-400">
                Please create the middleware.ts file.
              </div>
            )}

            {step5Checked && fileStatus.middlewareExists && !fileStatus.middlewareNotEmpty && (
              <div className="p-3 bg-(--vscode-input-background) border border-red-500 rounded text-sm text-red-400">
                File exists but appears to be empty. Please paste the code into the file and save.
              </div>
            )}

            {step5Checked && fileStatus.middlewareExists && fileStatus.middlewareNotEmpty && (
              <div className="p-3 bg-green-500/20 border border-green-500 rounded text-sm text-green-400">
                ✓ Middleware created and populated!
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
