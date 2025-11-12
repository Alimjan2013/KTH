import React, { useMemo, useState } from 'react';
import './index.css';
import { createRoot } from 'react-dom/client';
import { MessageList } from './components/MessageList.jsx';
import { InputBar } from './components/InputBar.jsx';
import { useVSCodeMessaging } from './hooks/useVSCodeMessaging.js';

function App() {
	const { messages, setMessages, typing, setTyping, sendUserMessage, requestDirectoryTree, openExternalUrl, openEnvFile } = useVSCodeMessaging();
	const [input, setInput] = useState('');
	

	function send() {
		const text = input.trim();
		if (!text) return;
		setMessages((prev) => [...prev, { text, isBot: false }]);
		setInput('');
		setTyping(true);
		sendUserMessage(text);
	}

	function requestTree() {
		requestDirectoryTree();
	}

	function openSupabaseDocs() {
		openExternalUrl('https://supabase.com/docs/guides/auth');
	}

	function handleOpenEnvFile() {
		openEnvFile();
	}

	return (
		<div className="h-screen flex flex-col">
			<MessageList messages={messages} typing={typing} />
			<InputBar input={input} setInput={setInput} onSend={send} onTree={requestTree} onOpenSupabaseDocs={openSupabaseDocs} onOpenEnvFile={handleOpenEnvFile} />
		</div>
	);
}

createRoot(document.getElementById('root')).render(<App />);


