function getConversationHtml() {
	return `<!DOCTYPE html>
<html lang="en">
	<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Conversation</title>
	<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background-color: var(--vscode-editor-background); height: 100vh; display: flex; flex-direction: column; }
		.conversation-container { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
		.message { display: flex; flex-direction: column; max-width: 80%; animation: fadeIn 0.3s ease-in; }
		@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0);} }
		.message.user { align-self: flex-end; }
		.message.bot { align-self: flex-start; }
		.message-bubble { padding: 10px 14px; border-radius: 12px; word-wrap: break-word; }
		.message.user .message-bubble { background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); }
		.message.bot .message-bubble { background-color: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); }
		.message-bubble.tree-message { font-family: 'Courier New', 'Monaco', 'Menlo', monospace; font-size: 12px; white-space: pre-wrap; max-height: 400px; overflow-y: auto; padding: 12px; }
		/* Markdown styling (subset) */
		.message-bubble.markdown-content { line-height: 1.6; }
		.message-bubble.markdown-content pre { background-color: var(--vscode-textCodeBlock-background); border: 1px solid var(--vscode-input-border); border-radius: 4px; padding: 12px; overflow-x: auto; margin: 0.8em 0; font-family: 'Courier New','Monaco','Menlo',monospace; font-size: 0.9em; line-height: 1.4; }
		.message-bubble.markdown-content code { background-color: var(--vscode-textCodeBlock-background); color: var(--vscode-textLink-foreground); padding: 2px 6px; border-radius: 3px; font-family: 'Courier New','Monaco','Menlo',monospace; font-size: 0.9em; }
		.message-time { font-size: 11px; opacity: 0.7; margin-top: 4px; padding: 0 4px; }
		.message.user .message-time { text-align: right; }
		.input-container { padding: 12px; border-top: 1px solid var(--vscode-panel-border); display: flex; gap: 8px; background-color: var(--vscode-editor-background); }
		#messageInput { flex: 1; padding: 8px 12px; border: 1px solid var(--vscode-input-border); border-radius: 4px; background-color: var(--vscode-input-background); color: var(--vscode-input-foreground); font-family: inherit; font-size: inherit; }
		#messageInput:focus { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }
		#sendButton { padding: 8px 16px; background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: inherit; }
		#sendButton:hover { background-color: var(--vscode-button-hoverBackground); }
		#sendButton:disabled { opacity: 0.5; cursor: not-allowed; }
		#showTreeButton { padding: 8px 12px; background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 12px; margin-right: 4px; }
		#showTreeButton:hover { background-color: var(--vscode-button-secondaryHoverBackground); }
		.welcome-message { text-align: center; padding: 40px 20px; opacity: 0.7; }
		.typing-indicator { display: flex; gap: 4px; padding: 10px 14px; align-items: center; }
		.typing-indicator .dot { width: 8px; height: 8px; border-radius: 50%; background-color: var(--vscode-descriptionForeground); animation: typing 1.4s infinite; }
		.typing-indicator .dot:nth-child(2) { animation-delay: 0.2s; }
		.typing-indicator .dot:nth-child(3) { animation-delay: 0.4s; }
		@keyframes typing { 0%,60%,100% { opacity: .3; transform: translateY(0);} 30% { opacity:1; transform: translateY(-4px);} }
	</style>
	</head>
	<body>
	<div class="conversation-container" id="conversationContainer">
		<div class="welcome-message" id="welcomeMessage">
			Loading conversation...
		</div>
	</div>
	<div class="input-container">
		<button id="showTreeButton" title="Show directory tree">📁 Tree</button>
		<input type="text" id="messageInput" placeholder="Type your message..." />
		<button id="sendButton">Send</button>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		const conversationContainer = document.getElementById('conversationContainer');
		const welcomeMessage = document.getElementById('welcomeMessage');
		const messageInput = document.getElementById('messageInput');
		const sendButton = document.getElementById('sendButton');
		const showTreeButton = document.getElementById('showTreeButton');
		let welcomeShown = true;
		let typingIndicator = null;

		function showTypingIndicator() {
			if (typingIndicator) return;
			if (welcomeShown && welcomeMessage) { welcomeMessage.remove(); welcomeShown = false; }
			const messageDiv = document.createElement('div');
			messageDiv.className = 'message bot';
			messageDiv.id = 'typing-indicator-container';
			const indicator = document.createElement('div');
			indicator.className = 'message-bubble typing-indicator';
			indicator.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
			messageDiv.appendChild(indicator);
			conversationContainer.appendChild(messageDiv);
			conversationContainer.scrollTop = conversationContainer.scrollHeight;
			typingIndicator = messageDiv;
		}

		function hideTypingIndicator() {
			if (!typingIndicator) return;
			typingIndicator.remove();
			typingIndicator = null;
		}

		function addMessage(text, isBot = false, isTree = false) {
			hideTypingIndicator();
			if (welcomeShown && welcomeMessage) { welcomeMessage.remove(); welcomeShown = false; }
			const messageDiv = document.createElement('div');
			messageDiv.className = \'message \' + (isBot ? 'bot' : 'user');
			const bubble = document.createElement('div');
			if (isTree) {
				bubble.className = 'message-bubble tree-message';
				bubble.textContent = text;
			} else if (isBot && typeof marked !== 'undefined') {
				bubble.className = 'message-bubble markdown-content';
				try { bubble.innerHTML = marked.parse(text, { breaks: true, gfm: true }); } catch { bubble.textContent = text; }
			} else {
				bubble.className = 'message-bubble';
				bubble.textContent = text;
			}
			messageDiv.appendChild(bubble);
			const time = document.createElement('div');
			time.className = 'message-time';
			time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
			messageDiv.appendChild(time);
			conversationContainer.appendChild(messageDiv);
			conversationContainer.scrollTop = conversationContainer.scrollHeight;
		}

		function sendMessage() {
			const text = messageInput.value.trim();
			if (!text) return;
			addMessage(text, false);
			messageInput.value = '';
			sendButton.disabled = true;
			vscode.postMessage({ command: 'sendMessage', text });
			setTimeout(() => { sendButton.disabled = false; messageInput.focus(); }, 500);
		}

		showTreeButton.addEventListener('click', () => { vscode.postMessage({ command: 'requestDirectoryTree' }); });
		sendButton.addEventListener('click', sendMessage);
		messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
		window.addEventListener('message', event => {
			const message = event.data;
			switch (message.command) {
				case 'receiveMessage':
					addMessage(message.text, message.isBot, message.isTree || false);
					sendButton.disabled = false;
					break;
				case 'addMockMessage':
					addMessage(message.text, message.isBot, false);
					break;
				case 'setTyping':
					if (message.typing) showTypingIndicator(); else hideTypingIndicator();
					break;
			}
		});
		messageInput.focus();
	</script>
	</body>
</html>`;
}

module.exports = { getConversationHtml };


