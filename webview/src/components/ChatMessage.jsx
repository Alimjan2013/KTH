import React from 'react';
import { Streamdown } from 'streamdown';

export function ChatMessage({ message }) {
	const mermaidConfig = {
		theme: 'dark',
		themeVariables: {
		  primaryColor: '#ff0000',
		  primaryTextColor: '#fff'
		}
	  };
	const isBot = !!message.isBot;
	const isTree = !!message.isTree;
	return (
		<div className={`max-w-[80%] ${isBot ? 'self-start' : 'self-end'}`}>
			<div className={`${isTree ? '' : ''} rounded-xl px-3 py-2 ${isBot ? 'bg-[var(--vscode-input-background)] text-[var(--vscode-foreground)] border border-[var(--vscode-input-border)]' : 'bg-[var(--btn-bg)] text-[var(--btn-fg)]'} ${isTree ? 'whitespace-pre-wrap font-mono text-[12px] max-h-96 overflow-y-auto p-3' : ''}`}>
				{isBot && !isTree ? (
					<Streamdown mermaidConfig={mermaidConfig}>{message.text}</Streamdown>
				) : (
					message.text
				)}
			</div>
			<div className={`text-[11px] opacity-70 mt-1 px-1 ${isBot ? 'text-left' : 'text-right'}`}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
		</div>
	);
}


