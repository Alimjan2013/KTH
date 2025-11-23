import { useEffect, useMemo, useState } from 'react';

export function useVSCodeMessaging() {
	const vscode = useMemo(() => (typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null), []);
	const [analysisSteps, setAnalysisSteps] = useState([]);
	const [analysisResult, setAnalysisResult] = useState(null);
	const [authPlan, setAuthPlan] = useState({ diagramImageUrl: '', changeMarkdown: '', loading: false });
	const [envLocalStatus, setEnvLocalStatus] = useState({ exists: false, hasUrl: false, hasKey: false, content: '', loading: false });

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
			}
		};
		window.addEventListener('message', handler);
		return () => window.removeEventListener('message', handler);
	}, []);

	function startAnalysis() {
		setAnalysisSteps([]);
		setAnalysisResult(null);
		vscode?.postMessage({ command: 'startAnalysis' });
	}

	function requestAuthPlan(feature = 'Auth') {
		setAuthPlan((prev) => ({ ...prev, loading: true }));
		vscode?.postMessage({ command: 'generateAuthPlan', feature });
	}

	function openExternalUrl(url) {
		vscode?.postMessage({ command: 'openExternalUrl', url });
	}

	function checkEnvLocal() {
		setEnvLocalStatus((prev) => ({ ...prev, loading: true }));
		vscode?.postMessage({ command: 'checkEnvLocal' });
	}

	function updateEnvLocal(url, key) {
		setEnvLocalStatus((prev) => ({ ...prev, loading: true }));
		vscode?.postMessage({ command: 'updateEnvLocal', url, key });
	}

	function validateEnvLocal() {
		vscode?.postMessage({ command: 'validateEnvLocal' });
	}

	function openEnvLocal() {
		vscode?.postMessage({ command: 'openEnvLocal' });
	}

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
		openEnvLocal
	};
}


