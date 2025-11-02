const vscode = require('vscode');
const path = require('path');

class ConversationProvider {
	constructor(context) {
		this.context = context;
	}

	resolveWebviewView(webviewView, _context, _token) {
		console.log('Resolving webview view for conversation');
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(this.context.extensionUri, 'media')
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
		console.log('Webview HTML set');

		// Send initial mock conversation data when webview is ready
		setTimeout(() => {
			this._loadInitialMockData(webviewView.webview);
		}, 100);

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'sendMessage':
						this._handleMessage(message.text);
						return;
				}
			},
			null,
			this.context.subscriptions
		);
	}

	_loadInitialMockData(webview) {
		// Mock conversation data to display initially
		const mockMessages = [
			{ text: "Hello! I'm here to help you learn. What would you like to know?", isBot: true },
			{ text: "How does this extension work?", isBot: false },
			{ text: "This extension provides an interactive learning experience. You can ask questions and get helpful responses to enhance your understanding!", isBot: true },
			{ text: "That sounds great! Can you explain more about webviews?", isBot: false },
			{ text: "Webviews in VS Code are powerful UI components that allow extensions to display custom HTML content. They're perfect for creating rich, interactive interfaces like this chat!", isBot: true }
		];

		mockMessages.forEach((msg, index) => {
			setTimeout(() => {
				webview.postMessage({
					command: 'addMockMessage',
					text: msg.text,
					isBot: msg.isBot
				});
			}, index * 300); // Stagger the messages for effect
		});
	}

	_handleMessage(text) {
		// Simulate a bot response
		const responses = [
			"That's a great question! Let me help you with that.",
			"I understand what you're asking. Here's what I think...",
			"Interesting! Let me break that down for you.",
			"Sure thing! Here's my take on that.",
			"Good point! Let me explain how that works."
		];
		const randomResponse = responses[Math.floor(Math.random() * responses.length)];
		
		// Send response back to webview
		if (this._view) {
			this._view.webview.postMessage({
				command: 'receiveMessage',
				text: randomResponse,
				isBot: true
			});
		}
	}

	_getHtmlForWebview(webview) {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Conversation</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		body {
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			height: 100vh;
			display: flex;
			flex-direction: column;
		}

		.conversation-container {
			flex: 1;
			overflow-y: auto;
			padding: 16px;
			display: flex;
			flex-direction: column;
			gap: 12px;
		}

		.message {
			display: flex;
			flex-direction: column;
			max-width: 80%;
			animation: fadeIn 0.3s ease-in;
		}

		@keyframes fadeIn {
			from {
				opacity: 0;
				transform: translateY(10px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}

		.message.user {
			align-self: flex-end;
		}

		.message.bot {
			align-self: flex-start;
		}

		.message-bubble {
			padding: 10px 14px;
			border-radius: 12px;
			word-wrap: break-word;
		}

		.message.user .message-bubble {
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
		}

		.message.bot .message-bubble {
			background-color: var(--vscode-input-background);
			border: 1px solid var(--vscode-input-border);
		}

		.message-time {
			font-size: 11px;
			opacity: 0.7;
			margin-top: 4px;
			padding: 0 4px;
		}

		.message.user .message-time {
			text-align: right;
		}

		.input-container {
			padding: 12px;
			border-top: 1px solid var(--vscode-panel-border);
			display: flex;
			gap: 8px;
			background-color: var(--vscode-editor-background);
		}

		#messageInput {
			flex: 1;
			padding: 8px 12px;
			border: 1px solid var(--vscode-input-border);
			border-radius: 4px;
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			font-family: inherit;
			font-size: inherit;
		}

		#messageInput:focus {
			outline: 1px solid var(--vscode-focusBorder);
			outline-offset: -1px;
		}

		#sendButton {
			padding: 8px 16px;
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-family: inherit;
			font-size: inherit;
		}

		#sendButton:hover {
			background-color: var(--vscode-button-hoverBackground);
		}

		#sendButton:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		.welcome-message {
			text-align: center;
			padding: 40px 20px;
			opacity: 0.7;
		}
	</style>
</head>
<body>
	<div class="conversation-container" id="conversationContainer">
		<div class="welcome-message" id="welcomeMessage">
			Loading conversation...
		</div>
	</div>
	<div class="input-container">
		<input type="text" id="messageInput" placeholder="Type your message..." />
		<button id="sendButton">Send</button>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		const conversationContainer = document.getElementById('conversationContainer');
		const welcomeMessage = document.getElementById('welcomeMessage');
		const messageInput = document.getElementById('messageInput');
		const sendButton = document.getElementById('sendButton');

		// Track if welcome message should be removed
		let welcomeShown = true;

		function addMessage(text, isBot = false) {
			if (welcomeShown && welcomeMessage) {
				welcomeMessage.remove();
				welcomeShown = false;
			}

			const messageDiv = document.createElement('div');
			messageDiv.className = \`message \${isBot ? 'bot' : 'user'}\`;

			const bubble = document.createElement('div');
			bubble.className = 'message-bubble';
			bubble.textContent = text;
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

			vscode.postMessage({
				command: 'sendMessage',
				text: text
			});

			// Re-enable button after a moment
			setTimeout(() => {
				sendButton.disabled = false;
				messageInput.focus();
			}, 500);
		}

		sendButton.addEventListener('click', sendMessage);
		messageInput.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				sendMessage();
			}
		});

		// Handle messages from extension
		window.addEventListener('message', event => {
			const message = event.data;
			switch (message.command) {
				case 'receiveMessage':
					addMessage(message.text, message.isBot);
					sendButton.disabled = false;
					break;
				case 'addMockMessage':
					addMessage(message.text, message.isBot);
					break;
			}
		});

		// Focus input on load
		messageInput.focus();
	</script>
</body>
</html>`;
	}
}

module.exports = ConversationProvider;

