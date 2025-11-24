import React, { useState } from 'react';
import './index.css';
import { createRoot } from 'react-dom/client';
import { Scene1Greeting } from './components/Scene1Greeting.jsx';
import { Scene2Analyzing } from './components/Scene2Analyzing.jsx';
import { Scene3ImplementAuth } from './components/Scene3ImplementAuth.jsx';
import { Scene4Guide } from './components/Scene4Guide.jsx';
import { Scene5BuildUI } from './components/Scene5BuildUI.jsx';
import { useVSCodeMessaging } from './hooks/useVSCodeMessaging.js';

function App() {
	const [currentScene, setCurrentScene] = useState(1);
	const [selectedFeature, setSelectedFeature] = useState(null);
	const { startAnalysis, analysisSteps, analysisResult, authPlan, requestAuthPlan, openExternalUrl, envLocalStatus, checkEnvLocal, updateEnvLocal, validateEnvLocal, openEnvLocal, packageStatus, checkSupabasePackages, createFile, checkFileExists, checkFileNotEmpty, openFile, fileStatus, setFileStatus } = useVSCodeMessaging();

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

	function handleGuide() {
		setCurrentScene(4);
	}

	function handleScene5() {
		setCurrentScene(5);
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
					authPlan={authPlan}
					onBack={() => setCurrentScene(2)}
					onGuide={handleGuide}
					onRequestPlan={() => requestAuthPlan('Auth')}
				/>
			)}
			{currentScene === 4 && (
				<Scene4Guide 
					onBack={() => setCurrentScene(3)} 
					onNext={handleScene5}
					openExternalUrl={openExternalUrl}
					envLocalStatus={envLocalStatus}
					checkEnvLocal={checkEnvLocal}
					validateEnvLocal={validateEnvLocal}
					openEnvLocal={openEnvLocal}
					packageStatus={packageStatus}
					checkSupabasePackages={checkSupabasePackages}
					createFile={createFile}
					checkFileExists={checkFileExists}
					checkFileNotEmpty={checkFileNotEmpty}
					fileStatus={fileStatus}
					setFileStatus={setFileStatus}
				/>
			)}
			{currentScene === 5 && (
				<Scene5BuildUI 
					onBack={() => setCurrentScene(4)} 
					createFile={createFile}
					checkFileExists={checkFileExists}
					checkFileNotEmpty={checkFileNotEmpty}
					openFile={openFile}
					fileStatus={fileStatus}
				/>
			)}
		</div>
	);
}

createRoot(document.getElementById('root')).render(<App />);


