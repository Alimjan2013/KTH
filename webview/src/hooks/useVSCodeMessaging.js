import { useEffect, useMemo, useState } from 'react';

export function useVSCodeMessaging() {
	const vscode = useMemo(() => (typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null), []);
	const [messages, setMessages] = useState([]);
	const [typing, setTyping] = useState(false);
	const [progress, setProgress] = useState(null);

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
				case 'showProgress':
					setProgress(msg.text);
					break;
				case 'updateProgress':
					setProgress(msg.text);
					break;
				case 'hideProgress':
					setProgress(null);
					break;
			}
		};
		window.addEventListener('message', handler);
		return () => window.removeEventListener('message', handler);
	}, []);

	function sendUserMessage(text) {
		vscode?.postMessage({ command: 'sendMessage', text });
	}

	function requestDirectoryTree() {
		vscode?.postMessage({ command: 'requestDirectoryTree' });
	}

	return { messages, setMessages, typing, setTyping, progress, sendUserMessage, requestDirectoryTree };
}


