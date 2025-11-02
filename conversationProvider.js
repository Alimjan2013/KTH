const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

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
			webview.postMessage({
				command: 'addMockMessage',
				text: "Hello! I'm here to help you learn. Try asking me to 'show directory tree' or 'show files' to see your workspace structure!",
				isBot: true
			});
		}, 100);
	}

	_handleMessage(text) {
		// Check if user is asking for directory tree
		const lowerText = text.toLowerCase();
		if (lowerText.includes('show') && (lowerText.includes('directory') || lowerText.includes('tree') || lowerText.includes('file'))) {
			this._sendDirectoryTree(this._view.webview);
			return;
		}

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

		function addMessage(text, isBot = false, isTree = false) {
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

