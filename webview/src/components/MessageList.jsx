import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage.jsx';

export function MessageList({ messages, typing, progress, mermaidConfig }) {
	const containerRef = useRef(null);

	useEffect(() => {
		if (!containerRef.current) return;
		containerRef.current.scrollTop = containerRef.current.scrollHeight;
	}, [messages, typing, progress]);

	return (
		<div ref={containerRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
			{messages.length === 0 && (
				<div className="text-center py-10 opacity-70">Start a conversation by typing a message below</div>
			)}
			{messages.map((m, i) => (
				<ChatMessage key={i} message={m}  />
			))}
			{progress && (
				<div className="self-start max-w-[80%] bg-blue-100 dark:bg-blue-900 rounded-xl px-4 py-2 border border-blue-300 dark:border-blue-700">
					<div className="flex items-center gap-2">
						<svg className="animate-spin h-4 w-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
							<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						<span className="text-sm text-blue-800 dark:text-blue-200">{progress}</span>
					</div>
				</div>
			)}
			{typing && (
				<div className="self-start max-w-[80%]">
					<div className="rounded-xl px-3 py-2 flex gap-1">
						<span className="w-2 h-2 rounded-full bg-(--muted) opacity-80" />
						<span className="w-2 h-2 rounded-full bg-(--muted) opacity-60" />
						<span className="w-2 h-2 rounded-full bg-(--muted) opacity-40" />
					</div>
				</div>
			)}
		</div>
	);
}


