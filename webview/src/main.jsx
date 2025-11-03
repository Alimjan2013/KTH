import React, { useEffect, useMemo, useRef, useState } from 'react';
import './index.css';
import { createRoot } from 'react-dom/client';

function App() {
	const vscode = useMemo(() => (typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null), []);
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState('');
	const [typing, setTyping] = useState(false);
	const containerRef = useRef(null);

	useEffect(() => {
		const handler = (event) => {
			const msg = event.data;
			switch (msg.command) {
				case 'receiveMessage':
					setTyping(false);
					setMessages((prev) => [...prev, { text: msg.text, isBot: !!msg.isBot, isTree: !!msg.isTree }]);
					break;
				case 'addMockMessage':
					setMessages((prev) => [...prev, { text: msg.text, isBot: !!msg.isBot }]);
					break;
				case 'setTyping':
					setTyping(!!msg.typing);
					break;
			}
		};
		window.addEventListener('message', handler);
		return () => window.removeEventListener('message', handler);
	}, []);

	useEffect(() => {
		if (!containerRef.current) return;
		containerRef.current.scrollTop = containerRef.current.scrollHeight;
	}, [messages, typing]);

	function send() {
		const text = input.trim();
		if (!text) return;
		setMessages((prev) => [...prev, { text, isBot: false }]);
		setInput('');
		setTyping(true);
		vscode?.postMessage({ command: 'sendMessage', text });
	}

	function requestTree() {
		vscode?.postMessage({ command: 'requestDirectoryTree' });
	}

	return (
		<div className="h-screen flex flex-col">
			<div ref={containerRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
				{messages.length === 0 && (
					<div className="text-center py-10 opacity-70">
						Start a conversation by typing a message below
					</div>
				)}
				{messages.map((m, i) => (
					<div key={i} className={`max-w-[80%] ${m.isBot ? 'self-start' : 'self-end'}`}>
						<div className={`${m.isTree ? '' : ''} rounded-xl px-3 py-2 ${m.isBot ? 'bg-[var(--vscode-input-background)] text-[var(--vscode-foreground)] border border-[var(--vscode-input-border)]' : 'bg-[var(--btn-bg)] text-[var(--btn-fg)]'} ${m.isTree ? 'whitespace-pre-wrap font-mono text-[12px] max-h-96 overflow-y-auto p-3' : ''}`}
							dangerouslySetInnerHTML={m.isBot && !m.isTree ? { __html: (window.marked ? window.marked.parse(m.text, { breaks: true, gfm: true }) : m.text) } : undefined}>
							{(m.isBot && !m.isTree) ? null : m.text}
						</div>
						<div className={`text-[11px] opacity-70 mt-1 px-1 ${m.isBot ? 'text-left' : 'text-right'}`}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
					</div>
				))}
				{typing && (
					<div className="self-start max-w-[80%]">
						<div className="rounded-xl px-3 py-2 flex gap-1">
							<span className="w-2 h-2 rounded-full bg-[var(--muted)] opacity-80" />
							<span className="w-2 h-2 rounded-full bg-[var(--muted)] opacity-60" />
							<span className="w-2 h-2 rounded-full bg-[var(--muted)] opacity-40" />
						</div>
					</div>
				)}
			</div>
			<div className="p-3 border-t border-[var(--panel-border)] flex gap-2">
				<button id="showTreeButton" title="Show directory tree" onClick={requestTree} className="px-3 py-2 rounded bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] text-xs">📁 Tree</button>
				<input id="messageInput" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') send(); }} placeholder="Type your message..." className="flex-1 px-3 py-2 rounded border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)]" />
				<button id="sendButton" onClick={send} className="px-4 py-2 rounded bg-[var(--btn-bg)] text-[var(--btn-fg)]">Send</button>
			</div>
		</div>
	);
}

createRoot(document.getElementById('root')).render(<App />);


