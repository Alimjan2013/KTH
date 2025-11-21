import React, { useState } from 'react';
import './index.css';
import { createRoot } from 'react-dom/client';
import { Scene1Greeting } from './components/Scene1Greeting.jsx';
import { Scene2Analyzing } from './components/Scene2Analyzing.jsx';
import { Scene3ImplementAuth } from './components/Scene3ImplementAuth.jsx';
import { useVSCodeMessaging } from './hooks/useVSCodeMessaging.js';

function App() {
	const [currentScene, setCurrentScene] = useState(1);
	const [selectedFeature, setSelectedFeature] = useState(null);
	const { startAnalysis, analysisSteps, analysisResult } = useVSCodeMessaging();

	function handleStartAnalyzing() {
		setCurrentScene(2);
		startAnalysis();
	}

	function handleFeatureSelect(feature) {
		setSelectedFeature(feature);
		if (feature === 'Auth') {
			setCurrentScene(3);
		}
	}

	return (
		<div className="h-screen flex flex-col">
			{currentScene === 1 && <Scene1Greeting onStartAnalyzing={handleStartAnalyzing} />}
			{currentScene === 2 && (
				<Scene2Analyzing
					analysisSteps={analysisSteps}
					analysisResult={analysisResult}
					onFeatureSelect={handleFeatureSelect}
					selectedFeature={selectedFeature}
				/>
			)}
			{currentScene === 3 && (
				<Scene3ImplementAuth
					analysisResult={analysisResult}
					onBack={() => setCurrentScene(2)}
				/>
			)}
		</div>
	);
}

createRoot(document.getElementById('root')).render(<App />);


