import React from 'react';

export function InputBar({ input, setInput, onSend, onTree, onOpenSupabaseDocs, onOpenEnvFile }) {
	return (
		<div className="p-3 border-t border-(--panel-border) flex gap-2">
			<button id="showTreeButton" title="Show directory tree" onClick={onTree} className="px-3 py-2 rounded bg-(--vscode-button-secondaryBackground) text-(--vscode-button-secondaryForeground) text-xs whitespace-nowrap">📁 Tree</button>
			<button id="openEnvFileButton" title="Edit .env file" onClick={onOpenEnvFile} className="px-3 py-2 rounded bg-(--vscode-button-secondaryBackground) text-(--vscode-button-secondaryForeground) text-xs hover:opacity-80 transition-opacity whitespace-nowrap">⚙️ env edit</button>
			<button id="openSupabaseDocsButton" title="Open Supabase Auth Documentation" onClick={onOpenSupabaseDocs} className="px-3 py-2 rounded bg-(--vscode-button-secondaryBackground) text-(--vscode-button-secondaryForeground) text-xs hover:opacity-80 transition-opacity whitespace-nowrap">🔗 Auth Docs</button>
			<input id="messageInput" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') onSend(); }} placeholder="Type your message..." className="flex-1 px-3 py-2 rounded border border-(--vscode-input-border) bg-(--vscode-input-background) text-(--vscode-input-foreground) min-w-0" />
			<button id="sendButton" onClick={onSend} className="px-4 py-2 rounded bg-(--btn-bg) text-(--btn-fg) whitespace-nowrap">Send</button>
		</div>
	);
}


