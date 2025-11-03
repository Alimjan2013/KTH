import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage.jsx';

export function MessageList({ messages, typing, mermaidConfig }) {
	const containerRef = useRef(null);

	useEffect(() => {
		if (!containerRef.current) return;
		containerRef.current.scrollTop = containerRef.current.scrollHeight;
	}, [messages, typing]);

	return (
		<div ref={containerRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
			{messages.length === 0 && (
				<div className="text-center py-10 opacity-70">Start a conversation by typing a message below</div>
			)}
			{messages.map((m, i) => (
				<ChatMessage key={i} message={m}  />
			))}
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


