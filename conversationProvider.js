const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

class ConversationProvider {
	constructor(context) {
		this.context = context;
		this.conversationHistory = [];
		this.openaiApiKey = null;
		this.openai = null;
		this._initializeOpenAI();
	}

	_initializeOpenAI() {
		try {
			// Try to load OpenAI dynamically
			const OpenAI = require('openai');
			
			// Read API key from .env file in workspace root
			this.openaiApiKey = this._readApiKeyFromEnv();
			
			if (!this.openaiApiKey) {
				console.warn('OpenAI API key not found. Please set OPENAI_API_KEY in .env file in your workspace root.');
				return;
			}
			
			// Initialize OpenAI with API key from .env
			this.openai = new OpenAI({
				apiKey: this.openaiApiKey
			});
			
			console.log('OpenAI initialized successfully with API key from .env file');
		} catch (error) {
			console.error('Error initializing OpenAI:', error.message);
			if (error.code === 'MODULE_NOT_FOUND') {
				console.warn('OpenAI package may not be installed. Run: pnpm install');
			}
		}
	}

	_readApiKeyFromEnv() {
		try {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			
			if (!workspaceFolders || workspaceFolders.length === 0) {
				console.log('No workspace folder open');
				return null;
			}

			const workspacePath = workspaceFolders[0].uri.fsPath;
			const envPath = path.join(workspacePath, '.env');
			
			if (!fs.existsSync(envPath)) {
				console.log('.env file not found in workspace root');
				return null;
			}

			const envContent = fs.readFileSync(envPath, 'utf8');
			const lines = envContent.split('\n');
			
			for (const line of lines) {
				const trimmed = line.trim();
				
				// Skip empty lines and comments
				if (trimmed === '' || trimmed.startsWith('#')) {
					continue;
				}
				
				// Look for OPENAI_API_KEY
				if (trimmed.startsWith('OPENAI_API_KEY=')) {
					let apiKey = trimmed.substring('OPENAI_API_KEY='.length).trim();
					
					// Remove quotes if present (handles OPENAI_API_KEY="key" or OPENAI_API_KEY='key')
					apiKey = apiKey.replace(/^["']|["']$/g, '');
					
					if (apiKey && apiKey !== 'YOUR_API_KEY_HERE') {
						console.log('Found OpenAI API key in .env file');
						return apiKey;
					}
				}
			}
			
			console.log('OPENAI_API_KEY not found in .env file');
			return null;
		} catch (error) {
			console.error('Error reading .env file:', error.message);
			return null;
		}
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
					case 'requestDirectoryTree':
						this._sendDirectoryTree(webviewView.webview);
						return;
				}
			},
			null,
			this.context.subscriptions
		);
	}

	_loadInitialMockData(webview) {
		// Initial welcome message
		setTimeout(() => {
			const welcomeMessage = this.openai 
				? "Hello! I'm powered by GPT-4o and ready to help you learn. Try asking me to 'show directory tree' or ask me any questions!"
				: "Hello! I'm here to help you learn. To enable AI features, please add OPENAI_API_KEY to your .env file in the workspace root.";
			
			webview.postMessage({
				command: 'addMockMessage',
				text: welcomeMessage,
				isBot: true
			});
		}, 100);
	}

	async _handleMessage(text) {
		// Check if user is asking for directory tree
		const lowerText = text.toLowerCase();
		if (lowerText.includes('show') && (lowerText.includes('directory') || lowerText.includes('tree') || lowerText.includes('file'))) {
			this._sendDirectoryTree(this._view.webview);
			return;
		}

		// Add user message to history
		this.conversationHistory.push({
			role: 'user',
			content: text
		});

		// If OpenAI is not available, send fallback message
		if (!this.openai || !this.openaiApiKey) {
			const fallbackMessage = "OpenAI API is not configured. Please add OPENAI_API_KEY to your .env file in the workspace root and reload the extension.";
			
			if (this._view) {
				this._view.webview.postMessage({
					command: 'receiveMessage',
					text: fallbackMessage,
					isBot: true
				});
			}
			return;
		}

		// Show typing indicator
		if (this._view) {
			this._view.webview.postMessage({
				command: 'setTyping',
				typing: true
			});
		}

		try {
			// Prepare messages with system prompt
			const messages = [
				{
					role: 'system',
					content: 'You are a helpful coding assistant in VS Code. You help developers learn and solve coding problems. Be concise, clear, and helpful.'
				},
				...this.conversationHistory
			];

			// Call OpenAI API
			const response = await this.openai.chat.completions.create({
				model: 'gpt-4o',
				messages: messages,
				temperature: 0.7,
				max_tokens: 1000
			});

			const assistantMessage = response.choices[0].message.content;

			// Add assistant response to history
			this.conversationHistory.push({
				role: 'assistant',
				content: assistantMessage
			});

			// Keep conversation history manageable (last 18 messages to keep total under 20 with system)
			if (this.conversationHistory.length > 18) {
				this.conversationHistory = this.conversationHistory.slice(-18);
			}

			// Send response to webview
			if (this._view) {
				this._view.webview.postMessage({
					command: 'setTyping',
					typing: false
				});
				
				this._view.webview.postMessage({
					command: 'receiveMessage',
					text: assistantMessage,
					isBot: true
				});
			}
		} catch (error) {
			console.error('Error calling OpenAI API:', error);
			
			let errorMessage = 'Sorry, I encountered an error while processing your request. ';
			if (error.response) {
				errorMessage += `API Error: ${error.response.status} - ${error.response.statusText}`;
			} else if (error.message) {
				errorMessage += error.message;
			} else {
				errorMessage += 'Please check your API key and try again.';
			}

			if (this._view) {
				this._view.webview.postMessage({
					command: 'setTyping',
					typing: false
				});
				
				this._view.webview.postMessage({
					command: 'receiveMessage',
					text: errorMessage,
					isBot: true
				});
			}

			// Remove the user message from history if there was an error
			if (this.conversationHistory.length > 0 && this.conversationHistory[this.conversationHistory.length - 1].role === 'user') {
				this.conversationHistory.pop();
			}
		}
	}

	async _sendDirectoryTree(webview) {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		
		if (!workspaceFolders || workspaceFolders.length === 0) {
			webview.postMessage({
				command: 'receiveMessage',
				text: "No workspace folder is currently open. Please open a folder first.",
				isBot: true,
				isTree: false
			});
			return;
		}

		try {
			const workspacePath = workspaceFolders[0].uri.fsPath;
			// Read and parse .gitignore
			const gitignorePatterns = this._readGitignore(workspacePath);
			const tree = await this._readDirectoryTree(workspacePath, '', [], 0, gitignorePatterns);
			const formattedTree = this._formatTree(tree, workspacePath);
			
			webview.postMessage({
				command: 'receiveMessage',
				text: formattedTree,
				isBot: true,
				isTree: true
			});
		} catch (error) {
			console.error('Error reading directory tree:', error);
			webview.postMessage({
				command: 'receiveMessage',
				text: `Error reading directory tree: ${error.message}`,
				isBot: true,
				isTree: false
			});
		}
	}

	_readGitignore(workspacePath) {
		const gitignorePath = path.join(workspacePath, '.gitignore');
		const patterns = [];
		
		try {
			if (fs.existsSync(gitignorePath)) {
				const content = fs.readFileSync(gitignorePath, 'utf8');
				const lines = content.split('\n');
				
				for (const line of lines) {
					const trimmed = line.trim();
					// Skip empty lines and comments
					if (trimmed === '' || trimmed.startsWith('#')) {
						continue;
					}
					patterns.push(trimmed);
				}
			}
		} catch (error) {
			console.log('Could not read .gitignore:', error.message);
		}
		
		return patterns;
	}

	_shouldIgnore(filePath, relativePath, gitignorePatterns) {
		if (!gitignorePatterns || gitignorePatterns.length === 0) {
			return false;
		}

		// Normalize path separators
		const normalizedPath = relativePath.replace(/\\/g, '/');
		const pathSegments = normalizedPath.split('/');
		
		for (const pattern of gitignorePatterns) {
			if (this._matchesPattern(normalizedPath, pathSegments, pattern)) {
				return true;
			}
		}
		
		return false;
	}

	_matchesPattern(filePath, pathSegments, pattern) {
		// Handle negation (starting with !) - skip for now
		if (pattern.startsWith('!')) {
			return false;
		}
		
		// Handle directory patterns (ending with /)
		const isDirectoryPattern = pattern.endsWith('/');
		const cleanPattern = isDirectoryPattern ? pattern.slice(0, -1) : pattern;
		
		// Handle root-anchored patterns (starting with /)
		const isRootAnchored = cleanPattern.startsWith('/');
		const normalizedPattern = isRootAnchored ? cleanPattern.slice(1) : cleanPattern;
		
		// Escape special regex characters and convert gitignore patterns
		let regexPattern = normalizedPattern
			.replace(/\./g, '\\.')           // Escape dots
			.replace(/\*\*/g, '___DOUBLE_STAR___')  // Temporarily replace **
			.replace(/\*/g, '[^/]*')         // * matches anything except /
			.replace(/___DOUBLE_STAR___/g, '.*')    // ** matches anything including /
			.replace(/\?/g, '[^/]');         // ? matches single char except /
		
		// If pattern has **, it can match across directories
		if (normalizedPattern.includes('**')) {
			const regex = new RegExp(regexPattern);
			return regex.test(filePath);
		}
		
		// Check if any path segment matches
		for (const segment of pathSegments) {
			const regex = new RegExp(`^${regexPattern}$`);
			if (regex.test(segment)) {
				return true;
			}
		}
		
		// Check if the pattern matches as part of the path
		if (isRootAnchored) {
			// Pattern anchored to root - check from beginning
			const regex = new RegExp(`^${regexPattern}`);
			return regex.test(filePath);
		} else {
			// Pattern can match anywhere
			const regex = new RegExp(regexPattern);
			// Check each segment
			for (const segment of pathSegments) {
				if (regex.test(segment)) {
					return true;
				}
			}
			// Check full path
			if (regex.test(filePath)) {
				return true;
			}
		}
		
		return false;
	}

	async _readDirectoryTree(dirPath, relativePath, tree, depth, gitignorePatterns = []) {
		// Limit depth to prevent too much recursion
		if (depth > 5) {
			return tree;
		}

		// Skip common directories that shouldn't be shown
		const skipDirs = ['node_modules', '.git', '.vscode', 'dist', 'build', '.next', 'out'];
		const dirName = path.basename(dirPath);
		if (skipDirs.includes(dirName) && depth > 0) {
			return tree;
		}

		try {
			const entries = fs.readdirSync(dirPath, { withFileTypes: true });
			
			// Sort: directories first, then files
			entries.sort((a, b) => {
				if (a.isDirectory() === b.isDirectory()) {
					return a.name.localeCompare(b.name);
				}
				return a.isDirectory() ? -1 : 1;
			});

			for (const entry of entries) {
				const fullPath = path.join(dirPath, entry.name);
				const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

				// Check if this entry should be ignored
				if (this._shouldIgnore(fullPath, relPath, gitignorePatterns)) {
					continue;
				}

				if (entry.isDirectory()) {
					tree.push({
						name: entry.name,
						path: relPath,
						type: 'directory',
						depth: depth
					});
					
					// Recursively read subdirectories
					await this._readDirectoryTree(fullPath, relPath, tree, depth + 1, gitignorePatterns);
				} else {
					tree.push({
						name: entry.name,
						path: relPath,
						type: 'file',
						depth: depth
					});
				}
			}
		} catch (error) {
			// Skip directories we can't read (permissions, etc.)
			console.log(`Skipping ${dirPath}: ${error.message}`);
		}

		return tree;
	}

	_formatTree(treeItems, rootPath) {
		if (treeItems.length === 0) {
			return "The workspace directory is empty.";
		}

		const rootName = path.basename(rootPath);
		let formatted = `📁 **${rootName}**\n\`\`\`\n`;

		// Build tree structure with proper tree characters
		for (let i = 0; i < treeItems.length; i++) {
			const item = treeItems[i];
			const depth = item.depth;
			
			// Determine if this is the last sibling at this depth
			let isLastSibling = true;
			for (let j = i + 1; j < treeItems.length; j++) {
				const nextItem = treeItems[j];
				if (nextItem.depth < depth) {
					break; // We've moved to a parent level
				}
				if (nextItem.depth === depth) {
					isLastSibling = false;
					break;
				}
			}
			
			// Build prefix for each level
			let prefix = '';
			for (let d = 1; d < depth; d++) {
				// For each parent level, check if there are more siblings coming
				let hasMoreAtLevel = false;
				
				// Look ahead to see if there are more items at this depth or below
				for (let j = i + 1; j < treeItems.length; j++) {
					const nextItem = treeItems[j];
					if (nextItem.depth < d) {
						break; // Moved to parent level
					}
					if (nextItem.depth === d) {
						hasMoreAtLevel = true;
						break;
					}
				}
				
				prefix += hasMoreAtLevel ? '│   ' : '    ';
			}
			
			prefix += isLastSibling ? '└── ' : '├── ';
			const icon = item.type === 'directory' ? '📁' : '📄';
			formatted += `${prefix}${icon} ${item.name}\n`;
		}

		formatted += `\`\`\``;
		return formatted;
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

		.message-bubble.tree-message {
			font-family: 'Courier New', 'Monaco', 'Menlo', monospace;
			font-size: 12px;
			white-space: pre-wrap;
			max-height: 400px;
			overflow-y: auto;
			padding: 12px;
		}

		.typing-indicator {
			display: flex;
			gap: 4px;
			padding: 10px 14px;
			align-items: center;
		}

		.typing-indicator .dot {
			width: 8px;
			height: 8px;
			border-radius: 50%;
			background-color: var(--vscode-descriptionForeground);
			animation: typing 1.4s infinite;
		}

		.typing-indicator .dot:nth-child(2) {
			animation-delay: 0.2s;
		}

		.typing-indicator .dot:nth-child(3) {
			animation-delay: 0.4s;
		}

		@keyframes typing {
			0%, 60%, 100% {
				opacity: 0.3;
				transform: translateY(0);
			}
			30% {
				opacity: 1;
				transform: translateY(-4px);
			}
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

		#showTreeButton {
			padding: 8px 12px;
			background-color: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-family: inherit;
			font-size: 12px;
			margin-right: 4px;
		}

		#showTreeButton:hover {
			background-color: var(--vscode-button-secondaryHoverBackground);
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

		// Track if welcome message should be removed
		let welcomeShown = true;
		let typingIndicator = null;

		function showTypingIndicator() {
			if (typingIndicator) {
				return; // Already showing
			}

			if (welcomeShown && welcomeMessage) {
				welcomeMessage.remove();
				welcomeShown = false;
			}

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
			if (typingIndicator) {
				typingIndicator.remove();
				typingIndicator = null;
			}
		}

		function addMessage(text, isBot = false, isTree = false) {
			// Hide typing indicator if shown
			hideTypingIndicator();

			if (welcomeShown && welcomeMessage) {
				welcomeMessage.remove();
				welcomeShown = false;
			}

			const messageDiv = document.createElement('div');
			messageDiv.className = \`message \${isBot ? 'bot' : 'user'}\`;

			const bubble = document.createElement('div');
			bubble.className = \`message-bubble \${isTree ? 'tree-message' : ''}\`;
			if (isTree) {
				bubble.textContent = text;
			} else {
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

		showTreeButton.addEventListener('click', () => {
			vscode.postMessage({
				command: 'requestDirectoryTree'
			});
		});

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
					addMessage(message.text, message.isBot, message.isTree || false);
					sendButton.disabled = false;
					break;
				case 'addMockMessage':
					addMessage(message.text, message.isBot, false);
					break;
				case 'setTyping':
					if (message.typing) {
						showTypingIndicator();
					} else {
						hideTypingIndicator();
					}
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

