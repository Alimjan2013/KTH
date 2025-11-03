import React, { useEffect, useMemo, useRef, useState } from 'react';
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
		<div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
			<div ref={containerRef} className="conversation-container" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
				{messages.length === 0 && (
					<div className="welcome-message" style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.7 }}>
						Start a conversation by typing a message below
					</div>
				)}
				{messages.map((m, i) => (
					<div key={i} className={`message ${m.isBot ? 'bot' : 'user'}`} style={{ alignSelf: m.isBot ? 'flex-start' : 'flex-end', maxWidth: '80%' }}>
						<div className={`message-bubble ${m.isTree ? 'tree-message' : m.isBot ? 'markdown-content' : ''}`} style={{ padding: '10px 14px', borderRadius: 12, background: m.isBot ? 'var(--vscode-input-background)' : 'var(--vscode-button-background)', color: m.isBot ? 'var(--vscode-foreground)' : 'var(--vscode-button-foreground)', border: m.isBot ? '1px solid var(--vscode-input-border)' : 'none', whiteSpace: m.isTree ? 'pre-wrap' : undefined }}
							dangerouslySetInnerHTML={m.isBot && !m.isTree ? { __html: (window.marked ? window.marked.parse(m.text, { breaks: true, gfm: true }) : m.text) } : undefined}>
							{(m.isBot && !m.isTree) ? null : m.text}
						</div>
						<div className="message-time" style={{ fontSize: 11, opacity: 0.7, marginTop: 4, padding: '0 4px', textAlign: m.isBot ? 'left' : 'right' }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
					</div>
				))}
				{typing && (
					<div className="message bot" style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
						<div className="message-bubble typing-indicator" style={{ padding: '10px 14px', borderRadius: 12, display: 'flex', gap: 4 }}>
							<span className="dot" style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--vscode-descriptionForeground)', opacity: 0.8 }} />
							<span className="dot" style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--vscode-descriptionForeground)', opacity: 0.6 }} />
							<span className="dot" style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--vscode-descriptionForeground)', opacity: 0.4 }} />
						</div>
					</div>
				)}
			</div>
			<div className="input-container" style={{ padding: 12, borderTop: '1px solid var(--vscode-panel-border)', display: 'flex', gap: 8 }}>
				<button id="showTreeButton" title="Show directory tree" onClick={requestTree} style={{ padding: '8px 12px', background: 'var(--vscode-button-secondaryBackground)', color: 'var(--vscode-button-secondaryForeground)', border: 0, borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>📁 Tree</button>
				<input id="messageInput" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') send(); }} placeholder="Type your message..." style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--vscode-input-border)', borderRadius: 4, background: 'var(--vscode-input-background)', color: 'var(--vscode-input-foreground)' }} />
				<button id="sendButton" onClick={send} style={{ padding: '8px 16px', background: 'var(--vscode-button-background)', color: 'var(--vscode-button-foreground)', border: 0, borderRadius: 4, cursor: 'pointer' }}>Send</button>
			</div>
		</div>
	);
}

createRoot(document.getElementById('root')).render(<App />);


