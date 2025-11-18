import { useEffect, useMemo, useState } from 'react';

export function useVSCodeMessaging() {
	const vscode = useMemo(() => (typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null), []);
	const [analysisSteps, setAnalysisSteps] = useState([]);
	const [analysisResult, setAnalysisResult] = useState(null);

	useEffect(() => {
		const handler = (event) => {
			const msg = event.data;
			switch (msg.command) {
				case 'analysisStep':
					setAnalysisSteps((prev) => [...prev, msg.step]);
					break;
				case 'analysisComplete':
					setAnalysisResult({
						markdown: msg.markdown || '',
						features: msg.features || []
					});
					break;
				case 'analysisError':
					console.error('Analysis error:', msg.error);
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

	return { startAnalysis, analysisSteps, analysisResult };
}


