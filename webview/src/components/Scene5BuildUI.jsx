import React, { useState, useEffect, useRef } from 'react';

const SIGNUP_CODE = `export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6 space-y-4">
        <header className="space-y-1">
          <p className="text-sm uppercase tracking-wide text-gray-500">Auth</p>
          <h1 className="text-2xl font-semibold text-gray-900">Create an account</h1>
          <p className="text-sm text-gray-500">This form only captures inputs for now.</p>
        </header>

        <form className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input type="email" className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="you@example.com" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input type="password" className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="••••••••" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Confirm password</label>
            <input type="password" className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="••••••••" />
          </div>
          <button type="submit" className="w-full rounded-md bg-black text-white py-2 font-semibold">
            Create account
          </button>
        </form>
      </div>
    </main>
  );
}`;

const LOGIN_CODE = `export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6 space-y-4">
        <header className="space-y-1">
          <p className="text-sm uppercase tracking-wide text-gray-500">Auth</p>
          <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>
          <p className="text-sm text-gray-500">Basic email + password UI without Supabase logic yet.</p>
        </header>

        <form className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input type="email" className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="you@example.com" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input type="password" className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="••••••••" />
          </div>
          <button type="submit" className="w-full rounded-md bg-black text-white py-2 font-semibold">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}`;

const SIGNUP_LOGIC_CODE = `import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export default function SignUpPage() {
  const signup = async (formData: FormData) => {
    'use server'
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: \`\${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback\`,
      },
    })

    if (error) {
      console.error(error)
      return redirect('/auth/error')
    }

    revalidatePath('/', 'layout')
    redirect('/')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6 space-y-4">
        <header className="space-y-1">
          <p className="text-sm uppercase tracking-wide text-gray-500">Auth</p>
          <h1 className="text-2xl font-semibold text-gray-900">Create an account</h1>
          <p className="text-sm text-gray-500">This form only captures inputs for now.</p>
        </header>

        <form action={signup} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input name="email" type="email" className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="you@example.com" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input name="password" type="password" className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="••••••••" />
          </div>
          <button type="submit" className="w-full rounded-md bg-black text-white py-2 font-semibold">
            Create account
          </button>
        </form>
      </div>
    </main>
  );
}`;

const LOGIN_LOGIC_CODE = `import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export default function LoginPage() {
  const login = async (formData: FormData) => {
    'use server'
    const supabase = await createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      redirect('/auth/error')
    }

    revalidatePath('/', 'layout')
    redirect('/')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6 space-y-4">
        <header className="space-y-1">
          <p className="text-sm uppercase tracking-wide text-gray-500">Auth</p>
          <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>
          <p className="text-sm text-gray-500">Basic email + password UI without Supabase logic yet.</p>
        </header>

        <form action={login} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input name="email" type="email" className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="you@example.com" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input name="password" type="password" className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="••••••••" />
          </div>
          <button type="submit" className="w-full rounded-md bg-black text-white py-2 font-semibold">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}`;

export function Scene5BuildUI({ onBack, createFile, checkFileExists, checkFileNotEmpty, openFile, fileStatus }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Checked, setStep1Checked] = useState(false);
  const [step2Checked, setStep2Checked] = useState(false);
  const [step3Checked, setStep3Checked] = useState(false);
  const [step4Checked, setStep4Checked] = useState(false);
  const containerRef = useRef(null);

  const copyToClipboard = (text) => navigator.clipboard.writeText(text);

  // Check for file existence when entering step
  useEffect(() => {
    if (currentStep === 1) {
      checkFileExists?.('app/auth/signup/page.tsx');
      setStep1Checked(false);
    } else if (currentStep === 2) {
      checkFileExists?.('app/auth/login/page.tsx');
      setStep2Checked(false);
    } else if (currentStep === 3) {
      setStep3Checked(false);
      checkFileNotEmpty?.('app/auth/signup/page.tsx');
    } else if (currentStep === 4) {
      setStep4Checked(false);
      checkFileNotEmpty?.('app/auth/login/page.tsx');
    }
  }, [currentStep, checkFileExists, checkFileNotEmpty]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  const handleCreateSignupPage = () => {
    createFile?.('app/auth/signup/page.tsx', '');
  };

  const handleCreateLoginPage = () => {
    createFile?.('app/auth/login/page.tsx', '');
  };

  const handleStep1Finished = () => {
    setStep1Checked(true);
    checkFileExists?.('app/auth/signup/page.tsx');
  };

  const handleStep2Finished = () => {
    setStep2Checked(true);
    checkFileExists?.('app/auth/login/page.tsx');
  };

  const handleStep3Finished = () => {
    setStep3Checked(true);
    checkFileNotEmpty?.('app/auth/signup/page.tsx');
  };

  const handleStep4Finished = () => {
    setStep4Checked(true);
    checkFileNotEmpty?.('app/auth/login/page.tsx');
  };

  // Auto-advance to Step 2
  useEffect(() => {
    if (step1Checked && fileStatus?.signupPageExists) {
      const timer = setTimeout(() => {
        setCurrentStep(2);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step1Checked, fileStatus?.signupPageExists]);

  // Auto-advance to Step 3
  useEffect(() => {
    if (step2Checked && fileStatus?.loginPageExists) {
      const timer = setTimeout(() => {
        setCurrentStep(3);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step2Checked, fileStatus?.loginPageExists]);

   // Auto-advance to Step 4
   useEffect(() => {
    if (step3Checked && fileStatus?.signupPageNotEmpty) {
      const timer = setTimeout(() => {
        setCurrentStep(4);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step3Checked, fileStatus?.signupPageNotEmpty]);

  return (
    <div ref={containerRef} className="h-screen flex flex-col p-2 overflow-y-auto gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-(--vscode-foreground)">
          Build Basic Auth UI
        </h1>
        <p className="text-(--vscode-descriptionForeground) max-w-3xl">
          Scene 5: Build simple UI for login and signup.
        </p>
      </header>

      {/* Step 1: Create Signup Page */}
      {currentStep === 1 && (
        <section className="bg-(--vscode-editor-background) border border-(--vscode-input-border) rounded-xl p-2 space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-6 h-6 rounded-full bg-(--vscode-button-background) text-(--vscode-button-foreground) flex items-center justify-center font-bold">
                1
              </div>
              <h4 className="flex-1 text-base font-semibold text-(--vscode-foreground)">
                Create Signup Page
              </h4>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-(--vscode-descriptionForeground)">File: <code>app/auth/signup/page.tsx</code></p>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={handleCreateSignupPage}
                  disabled={fileStatus?.creatingSignupPage || fileStatus?.signupPageExists}
                  className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
                >
                  {fileStatus?.signupPageExists ? '✓ Created' : fileStatus?.creatingSignupPage ? 'Creating…' : 'Create signup page'}
                </button>
                
                <div className="relative bg-(--vscode-input-background) border border-(--vscode-input-border) rounded-lg p-4 font-mono text-sm text-(--vscode-foreground)">
                  <button
                    onClick={() => copyToClipboard(SIGNUP_CODE)}
                    className="absolute top-2 right-2 px-2 py-1 rounded border border-(--vscode-input-border) text-xs text-(--vscode-descriptionForeground) hover:bg-(--vscode-editor-background)"
                  >
                    Copy
                  </button>
                  <pre className="whitespace-pre-wrap">{SIGNUP_CODE}</pre>
                </div>
              </div>
            </div>

            <button
              onClick={handleStep1Finished}
              className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium"
            >
              I finished
            </button>

            {step1Checked && !fileStatus?.signupPageExists && (
              <div className="p-3 bg-(--vscode-input-background) border border-red-500 rounded text-sm text-red-400">
                Please create the signup page.
              </div>
            )}

            {step1Checked && fileStatus?.signupPageExists && (
              <div className="p-3 bg-green-500/20 border border-green-500 rounded text-sm text-green-400">
                ✓ Signup page created!
              </div>
            )}
          </div>
        </section>
      )}

      {/* Step 2: Create Login Page */}
      {currentStep === 2 && (
        <section className="bg-(--vscode-editor-background) border border-(--vscode-input-border) rounded-xl p-2 space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-6 h-6 rounded-full bg-(--vscode-button-background) text-(--vscode-button-foreground) flex items-center justify-center font-bold">
                2
              </div>
              <h4 className="flex-1 text-base font-semibold text-(--vscode-foreground)">
                Create Login Page
              </h4>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                 <p className="text-sm text-(--vscode-descriptionForeground)">File: <code>app/auth/login/page.tsx</code></p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleCreateLoginPage}
                  disabled={fileStatus?.creatingLoginPage || fileStatus?.loginPageExists}
                  className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
                >
                  {fileStatus?.loginPageExists ? '✓ Created' : fileStatus?.creatingLoginPage ? 'Creating…' : 'Create login page'}
                </button>

                <div className="relative bg-(--vscode-input-background) border border-(--vscode-input-border) rounded-lg p-4 font-mono text-sm text-(--vscode-foreground)">
                  <button
                    onClick={() => copyToClipboard(LOGIN_CODE)}
                    className="absolute top-2 right-2 px-2 py-1 rounded border border-(--vscode-input-border) text-xs text-(--vscode-descriptionForeground) hover:bg-(--vscode-editor-background)"
                  >
                    Copy
                  </button>
                  <pre className="whitespace-pre-wrap">{LOGIN_CODE}</pre>
                </div>
              </div>
            </div>

            <button
              onClick={handleStep2Finished}
              className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium"
            >
              I finished
            </button>

            {step2Checked && !fileStatus?.loginPageExists && (
              <div className="p-3 bg-(--vscode-input-background) border border-red-500 rounded text-sm text-red-400">
                Please create the login page.
              </div>
            )}

             {step2Checked && fileStatus?.loginPageExists && (
              <div className="p-3 bg-green-500/20 border border-green-500 rounded text-sm text-green-400">
                ✓ Login page created!
              </div>
            )}
          </div>
        </section>
      )}

      {/* Step 3: Implement Sign-up Logic */}
      {currentStep === 3 && (
        <section className="bg-(--vscode-editor-background) border border-(--vscode-input-border) rounded-xl p-2 space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-6 h-6 rounded-full bg-(--vscode-button-background) text-(--vscode-button-foreground) flex items-center justify-center font-bold">
                3
              </div>
              <h4 className="flex-1 text-base font-semibold text-(--vscode-foreground)">
                Implement Sign-up Logic
              </h4>
            </div>

            <div className="space-y-3">
              <div className="text-(--vscode-descriptionForeground) space-y-2">
                <p>We'll upgrade the static placeholder to a functional Server Component. The new code introduces a <code>signup</code> Server Action that:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Initializes the Supabase client on the server.</li>
                  <li>Captures form data and calls <code>supabase.auth.signUp</code>.</li>
                  <li>Handles the email confirmation flow by setting a redirect URL.</li>
                </ul>
                <p className="mt-2">
                  Replace the content of <code>app/auth/signup/page.tsx</code> with the following code to implement server-side sign-up.
                </p>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => openFile?.('app/auth/signup/page.tsx')}
                  className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium"
                >
                  Open app/auth/signup/page.tsx
                </button>
                
                <div className="relative bg-(--vscode-input-background) border border-(--vscode-input-border) rounded-lg p-4 font-mono text-sm text-(--vscode-foreground)">
                  <button
                    onClick={() => copyToClipboard(SIGNUP_LOGIC_CODE)}
                    className="absolute top-2 right-2 px-2 py-1 rounded border border-(--vscode-input-border) text-xs text-(--vscode-descriptionForeground) hover:bg-(--vscode-editor-background)"
                  >
                    Copy
                  </button>
                  <pre className="whitespace-pre-wrap">{SIGNUP_LOGIC_CODE}</pre>
                </div>
              </div>
            </div>

            <button
              onClick={handleStep3Finished}
              className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium"
            >
              I finished
            </button>

            {step3Checked && !fileStatus?.signupPageNotEmpty && (
              <div className="p-3 bg-(--vscode-input-background) border border-red-500 rounded text-sm text-red-400">
                File exists but still looks empty. Paste the code above and save before continuing.
              </div>
            )}

             {step3Checked && fileStatus?.signupPageNotEmpty && (
              <div className="p-3 bg-green-500/20 border border-green-500 rounded text-sm text-green-400">
                ✓ Logic updated!
              </div>
            )}
          </div>
        </section>
      )}

      {/* Step 4: Implement Login Logic */}
      {currentStep === 4 && (
        <section className="bg-(--vscode-editor-background) border border-(--vscode-input-border) rounded-xl p-2 space-y-4">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-6 h-6 rounded-full bg-(--vscode-button-background) text-(--vscode-button-foreground) flex items-center justify-center font-bold">
                4
              </div>
              <h4 className="flex-1 text-base font-semibold text-(--vscode-foreground)">
                Implement Login Logic
              </h4>
            </div>

            <div className="space-y-3">
              <div className="text-(--vscode-descriptionForeground) space-y-2">
                <p>We'll do the same for login. The new code adds a <code>login</code> Server Action that:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Authenticates users with <code>supabase.auth.signInWithPassword</code>.</li>
                  <li>Validates credentials against your Supabase project.</li>
                  <li>Establishes a session and redirects the user to the home page.</li>
                </ul>
                <p className="mt-2">
                  Replace the content of <code>app/auth/login/page.tsx</code> with the following code to implement server-side login.
                </p>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => openFile?.('app/auth/login/page.tsx')}
                  className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium"
                >
                   Open app/auth/login/page.tsx
                </button>
                
                <div className="relative bg-(--vscode-input-background) border border-(--vscode-input-border) rounded-lg p-4 font-mono text-sm text-(--vscode-foreground)">
                  <button
                    onClick={() => copyToClipboard(LOGIN_LOGIC_CODE)}
                    className="absolute top-2 right-2 px-2 py-1 rounded border border-(--vscode-input-border) text-xs text-(--vscode-descriptionForeground) hover:bg-(--vscode-editor-background)"
                  >
                    Copy
                  </button>
                  <pre className="whitespace-pre-wrap">{LOGIN_LOGIC_CODE}</pre>
                </div>
              </div>
            </div>

            <button
              onClick={handleStep4Finished}
              className="py-2 w-full rounded-lg bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:opacity-90 transition-opacity font-medium"
            >
              I finished
            </button>

            {step4Checked && !fileStatus?.loginPageNotEmpty && (
              <div className="p-3 bg-(--vscode-input-background) border border-red-500 rounded text-sm text-red-400">
                File exists but still looks empty. Paste the code above and save before continuing.
              </div>
            )}

             {step4Checked && fileStatus?.loginPageNotEmpty && (
              <div className="p-3 bg-green-500/20 border border-green-500 rounded text-sm text-green-400">
                ✓ Logic updated!
              </div>
            )}
          </div>
        </section>
      )}

      <div className="flex justify-between mt-auto">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-md border border-(--vscode-button-border) bg-transparent text-(--vscode-foreground) hover:bg-(--vscode-input-background) transition"
        >
          ← Back to Guide
        </button>
      </div>
    </div>
  );
}
