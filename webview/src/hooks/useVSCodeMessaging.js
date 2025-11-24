import { useEffect, useMemo, useState, useCallback } from 'react';

export function useVSCodeMessaging() {
	const vscode = useMemo(() => (typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null), []);
	const [analysisSteps, setAnalysisSteps] = useState([]);
	const [analysisResult, setAnalysisResult] = useState(null);
	const [authPlan, setAuthPlan] = useState({ diagramImageUrl: '', changeMarkdown: '', loading: false });
	const [envLocalStatus, setEnvLocalStatus] = useState({ exists: false, hasUrl: false, hasKey: false, content: '', loading: false });
	const [packageStatus, setPackageStatus] = useState({ installed: false, hasSupabaseJs: false, hasSupabaseSsr: false, loading: false });
	const [fileStatus, setFileStatus] = useState({ 
		clientExists: false, 
		serverExists: false, 
		middlewareExists: false,
		signupPageExists: false,
		loginPageExists: false,
		clientNotEmpty: false,
		serverNotEmpty: false,
		middlewareNotEmpty: false,
		signupPageNotEmpty: false,
		loginPageNotEmpty: false,
		loading: false, 
		creatingClient: false, 
		creatingServer: false,
		creatingMiddleware: false,
		creatingSignupPage: false,
		creatingLoginPage: false,
		validationError: null
	});

	useEffect(() => {
		const handler = (event) => {
			const msg = event.data;
			switch (msg.command) {
				case 'analysisStep':
					setAnalysisSteps((prev) => [...prev, msg.step]);
					break;
				case 'analysisComplete':
					const result = {
						markdown: msg.markdown || '',
						features: msg.features || []
					};
					setAnalysisResult(result);
					vscode?.postMessage({
						command: 'cacheAnalysisResult',
						markdown: result.markdown,
						features: result.features
					});
					setAuthPlan({ diagramImageUrl: '', changeMarkdown: '', loading: false });
					break;
				case 'analysisError':
					console.error('Analysis error:', msg.error);
					break;
				case 'authPlanLoading':
					setAuthPlan((prev) => ({ ...prev, loading: true }));
					break;
				case 'authPlanGenerated':
					setAuthPlan({
						diagramImageUrl: msg.diagramImageUrl || '',
						changeMarkdown: msg.changeMarkdown || '',
						loading: false
					});
					break;
				case 'authPlanError':
					console.error('Auth plan error:', msg.error);
					setAuthPlan((prev) => ({ ...prev, loading: false }));
					break;
				case 'envLocalStatus':
					setEnvLocalStatus({
						exists: msg.exists || false,
						hasUrl: msg.hasUrl || false,
						hasKey: msg.hasKey || false,
						content: msg.content || '',
						loading: false,
						error: msg.error
					});
					break;
				case 'envLocalUpdated':
					if (msg.success) {
						setEnvLocalStatus((prev) => ({ ...prev, loading: true }));
						vscode?.postMessage({ command: 'checkEnvLocal' });
					} else {
						setEnvLocalStatus((prev) => ({ ...prev, loading: false, error: msg.error }));
					}
					break;
				case 'envLocalValidated':
					setEnvLocalStatus((prev) => ({ ...prev, valid: msg.valid, validationErrors: msg.errors || msg.error }));
					break;
				case 'envLocalOpened':
					setEnvLocalStatus((prev) => ({ ...prev, opened: msg.success, error: msg.error }));
					break;
				case 'supabasePackagesChecked':
					setPackageStatus({
						installed: msg.installed || false,
						hasSupabaseJs: msg.hasSupabaseJs || false,
						hasSupabaseSsr: msg.hasSupabaseSsr || false,
						loading: false,
						error: msg.error
					});
					break;
				case 'fileCreated':
					if (msg.path.endsWith('client.ts')) {
						setFileStatus((prev) => ({ ...prev, clientExists: msg.success, creatingClient: false }));
					} else if (msg.path.endsWith('server.ts')) {
						setFileStatus((prev) => ({ ...prev, serverExists: msg.success, creatingServer: false }));
					} else if (msg.path.endsWith('middleware.ts')) {
						setFileStatus((prev) => ({ ...prev, middlewareExists: msg.success, creatingMiddleware: false }));
					} else if (msg.path.endsWith('app/auth/signup/page.tsx')) {
						setFileStatus((prev) => ({ ...prev, signupPageExists: msg.success, creatingSignupPage: false }));
					} else if (msg.path.endsWith('app/auth/login/page.tsx')) {
						setFileStatus((prev) => ({ ...prev, loginPageExists: msg.success, creatingLoginPage: false }));
					}
					break;
				case 'fileExists':
					if (msg.path.endsWith('client.ts')) {
						setFileStatus((prev) => ({ ...prev, clientExists: msg.exists }));
					} else if (msg.path.endsWith('server.ts')) {
						setFileStatus((prev) => ({ ...prev, serverExists: msg.exists }));
					} else if (msg.path.endsWith('middleware.ts')) {
						setFileStatus((prev) => ({ ...prev, middlewareExists: msg.exists }));
					} else if (msg.path.endsWith('app/auth/signup/page.tsx')) {
						setFileStatus((prev) => ({ ...prev, signupPageExists: msg.exists }));
					} else if (msg.path.endsWith('app/auth/login/page.tsx')) {
						setFileStatus((prev) => ({ ...prev, loginPageExists: msg.exists }));
					}
					break;
				case 'fileNotEmptyChecked':
					if (msg.path.endsWith('client.ts')) {
						setFileStatus((prev) => ({ ...prev, clientNotEmpty: msg.notEmpty }));
					} else if (msg.path.endsWith('server.ts')) {
						setFileStatus((prev) => ({ ...prev, serverNotEmpty: msg.notEmpty }));
					} else if (msg.path.endsWith('middleware.ts')) {
						setFileStatus((prev) => ({ ...prev, middlewareNotEmpty: msg.notEmpty }));
					} else if (msg.path.endsWith('app/auth/signup/page.tsx')) {
						setFileStatus((prev) => ({ ...prev, signupPageNotEmpty: msg.notEmpty }));
					} else if (msg.path.endsWith('app/auth/login/page.tsx')) {
						setFileStatus((prev) => ({ ...prev, loginPageNotEmpty: msg.notEmpty }));
					}
					break;
			}
		};
		window.addEventListener('message', handler);
		return () => window.removeEventListener('message', handler);
	}, [vscode]);

	const startAnalysis = useCallback(() => {
		setAnalysisSteps([]);
		setAnalysisResult(null);
		vscode?.postMessage({ command: 'startAnalysis' });
	}, [vscode]);

	const requestAuthPlan = useCallback((feature = 'Auth') => {
		setAuthPlan((prev) => ({ ...prev, loading: true }));
		vscode?.postMessage({ command: 'generateAuthPlan', feature });
	}, [vscode]);

	const openExternalUrl = useCallback((url) => {
		vscode?.postMessage({ command: 'openExternalUrl', url });
	}, [vscode]);

	const checkEnvLocal = useCallback(() => {
		setEnvLocalStatus((prev) => ({ ...prev, loading: true }));
		vscode?.postMessage({ command: 'checkEnvLocal' });
	}, [vscode]);

	const updateEnvLocal = useCallback((url, key) => {
		setEnvLocalStatus((prev) => ({ ...prev, loading: true }));
		vscode?.postMessage({ command: 'updateEnvLocal', url, key });
	}, [vscode]);

	const validateEnvLocal = useCallback(() => {
		vscode?.postMessage({ command: 'validateEnvLocal' });
	}, [vscode]);

	const openEnvLocal = useCallback(() => {
		vscode?.postMessage({ command: 'openEnvLocal' });
	}, [vscode]);

	const checkSupabasePackages = useCallback(() => {
		setPackageStatus((prev) => ({ ...prev, loading: true }));
		vscode?.postMessage({ command: 'checkSupabasePackages' });
	}, [vscode]);

	const createFile = useCallback((path, content) => {
		if (path.endsWith('client.ts')) {
			setFileStatus((prev) => ({ ...prev, creatingClient: true }));
		} else if (path.endsWith('server.ts')) {
			setFileStatus((prev) => ({ ...prev, creatingServer: true }));
		} else if (path.endsWith('middleware.ts')) {
			setFileStatus((prev) => ({ ...prev, creatingMiddleware: true }));
		} else if (path.endsWith('app/auth/signup/page.tsx')) {
			setFileStatus((prev) => ({ ...prev, creatingSignupPage: true }));
		} else if (path.endsWith('app/auth/login/page.tsx')) {
			setFileStatus((prev) => ({ ...prev, creatingLoginPage: true }));
		}
		vscode?.postMessage({ command: 'createFile', path, content });
	}, [vscode]);

	const checkFileExists = useCallback((path) => {
		vscode?.postMessage({ command: 'checkFileExists', path });
	}, [vscode]);

	const checkFileNotEmpty = useCallback((path) => {
		vscode?.postMessage({ command: 'checkFileNotEmpty', path });
	}, [vscode]);

	const openFile = useCallback((path) => {
		vscode?.postMessage({ command: 'openFile', path });
	}, [vscode]);

	return { 
		startAnalysis, 
		analysisSteps, 
		analysisResult, 
		authPlan, 
		requestAuthPlan, 
		openExternalUrl,
		envLocalStatus,
		checkEnvLocal,
		updateEnvLocal,
		validateEnvLocal,
		openEnvLocal,
		packageStatus,
		checkSupabasePackages,
		createFile,
		checkFileExists,
		checkFileNotEmpty,
		openFile,
		fileStatus,
		setFileStatus
	};
}


