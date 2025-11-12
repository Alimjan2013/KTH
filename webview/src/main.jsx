import React, { useState } from 'react';
import './index.css';
import { createRoot } from 'react-dom/client';
import { Scene1Greeting } from './components/Scene1Greeting.jsx';
import { Scene2Analyzing } from './components/Scene2Analyzing.jsx';
import { useVSCodeMessaging } from './hooks/useVSCodeMessaging.js';

function App() {
	const [currentScene, setCurrentScene] = useState(1);
	const { startAnalysis, analysisSteps, analysisResult } = useVSCodeMessaging();

	function handleStartAnalyzing() {
		setCurrentScene(2);
		startAnalysis();
	}

	function handleFeatureSelect(feature) {
		console.log('Feature selected:', feature);
		// TODO: Handle feature selection in future scenes
	}

	return (
		<div className="h-screen flex flex-col">
			{currentScene === 1 && <Scene1Greeting onStartAnalyzing={handleStartAnalyzing} />}
			{currentScene === 2 && (
				<Scene2Analyzing
					analysisSteps={analysisSteps}
					analysisResult={analysisResult}
					onFeatureSelect={handleFeatureSelect}
				/>
			)}
		</div>
	);
}

createRoot(document.getElementById('root')).render(<App />);


