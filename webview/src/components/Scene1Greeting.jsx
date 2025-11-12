import React from 'react';

export function Scene1Greeting({ onStartAnalyzing }) {
	return (
		<div className="h-screen flex flex-col items-center justify-center p-8">
			<div className="text-center max-w-2xl">
				<h1 className="text-4xl font-bold mb-6 text-[var(--vscode-foreground)]">
					Hey welcome!
				</h1>
				<p className="text-xl mb-8 text-[var(--vscode-descriptionForeground)]">
					Today we are exploring this codebase
				</p>
				<button
					onClick={onStartAnalyzing}
					className="px-8 py-3 rounded-lg bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:opacity-90 transition-opacity text-lg font-medium"
				>
					Analyzing
				</button>
			</div>
		</div>
	);
}

