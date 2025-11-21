import { useEffect, useMemo, useState } from 'react';

export function useVSCodeMessaging() {
	const vscode = useMemo(() => (typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null), []);
	const [analysisSteps, setAnalysisSteps] = useState([]);
	const [analysisResult, setAnalysisResult] = useState(null);
	const [authPlan, setAuthPlan] = useState({ diagramImageUrl: '', changeMarkdown: '', loading: false });

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

	return { startAnalysis, analysisSteps, analysisResult, authPlan, requestAuthPlan };
}


