const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const dirTree = require('./services/dirTree');
const { getReactHtml } = require('./ui/conversationHtml');
const { streamText, generateText, tool } = require('ai');
const { createGateway } = require('@ai-sdk/gateway');
const { z } = require('zod');
const dotenv = require('dotenv');

class ConversationProvider {
	constructor(context) {
		this.context = context;
		this.conversationHistory = [];
		this.openaiApiKey = null;
		this.openai = null;
		this._initializeOpenAI();
	}

	async _answerWithDirectoryTree(userText) {
		// Show progress: analyzing codebase
		if (this._view) {
			this._view.webview.postMessage({
				command: 'showProgress',
				text: 'Analyzing codebase structure...'
			});
		}
		
		const treeText = await this._getDirectoryTreeAsText();
		const gateway = createGateway({ apiKey: this.openaiApiKey, baseUrl: this.gatewayBaseUrl || undefined });
		const prompt = [
			`USER QUESTION: ${userText}`,
			'',
			'PROJECT DIRECTORY TREE:',
			treeText,
			'',
			'Please summarize the project structure (key folders/files, roles, and any notable patterns). Be concise and actionable.'
		].join('\n');

		// Show progress: waiting for AI response
		if (this._view) {
			this._view.webview.postMessage({
				command: 'updateProgress',
				text: 'Generating response with AI...'
			});
		}

		let finalResponse = '';
		try {
			const result = await generateText({
				model: gateway('openai/gpt-4o'),
				prompt,
				maxTokens: 800,
				temperature: 0.5,
			});
			finalResponse = (result && typeof result.text === 'string') ? result.text : '';
			if (!finalResponse || !finalResponse.trim()) {
				finalResponse = 'I reviewed the directory tree but could not generate a summary. Please try again.';
			}
		} catch (err) {
			console.error('answerWithDirectoryTree error:', err && err.message ? err.message : err);
			finalResponse = 'There was an error summarizing the directory tree.';
		}

		this.conversationHistory.push({ role: 'assistant', content: finalResponse });
		if (this._view) {
			this._view.webview.postMessage({ command: 'hideProgress' });
			this._view.webview.postMessage({ command: 'setTyping', typing: false });
			this._view.webview.postMessage({ command: 'receiveMessage', text: finalResponse, isBot: true });
		}
	}

	_initializeOpenAI() {
		try {
			// Load env from workspace root
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (workspaceFolders && workspaceFolders.length > 0) {
				const workspacePath = workspaceFolders[0].uri.fsPath;
				dotenv.config({ path: path.join(workspacePath, '.env') });
			}

			// Read gateway API key first, fallback to OPENAI_API_KEY
			this.openaiApiKey = process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY || null;
			if (!this.openaiApiKey) {
				console.warn('OpenAI API key not found. Please set OPENAI_API_KEY in .env file in your workspace root.');
				return;
			}

			console.log('Vercel AI SDK will be used via streamText with env configuration');
		} catch (error) {
			console.error('Error initializing OpenAI:', error.message);
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

		const nonce = Math.random().toString(36).slice(2);
		const mediaRoot = vscode.Uri.joinPath(this.context.extensionUri, 'media');
		const scriptUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, 'webview.js'));
		const styleUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, 'webview.css'));
		webviewView.webview.html = getReactHtml({
			scriptUri: scriptUri.toString(),
			styleUri: styleUri.toString(),
			cspSource: webviewView.webview.cspSource,
			nonce
		});
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
		// Check if user is asking for directory tree (direct command)
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

		// If API key is not available, send fallback message
		if (!this.openaiApiKey) {
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
			// Heuristic: if the user asks about structure, eagerly fetch tree and answer with it
			const wantsStructure = /structure|project\s*tree|directory|folders|files|layout/i.test(text);
			if (wantsStructure) {
				await this._answerWithDirectoryTree(text);
				return;
			}

			await this._processWithVercelAI();
		} catch (error) {
			console.error('Error in _handleMessage:', error);
			
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

	_getAvailableTools() {
		return [
			{
				type: 'function',
				function: {
					name: 'get_directory_tree',
					description: 'Get the directory tree structure of the current workspace. Use this when you need to understand the project structure, file organization, or analyze the codebase layout. The tool will return a formatted tree view showing all files and directories.',
					parameters: {
						type: 'object',
						properties: {
							reason: {
								type: 'string',
								description: 'Brief reason why you need to see the directory tree (e.g., "analyzing project structure", "finding configuration files", "understanding codebase organization")'
							}
						},
						required: ['reason']
					}
				}
			}
		];
	}

	async _executeTool(functionName, arguments_) {
		switch (functionName) {
			case 'get_directory_tree':
				try {
					const treeText = await this._getDirectoryTreeAsText();
					return {
						success: true,
						result: treeText
					};
				} catch (error) {
					return {
						success: false,
						error: `Error reading directory tree: ${error.message}`
					};
				}
			default:
				return {
					success: false,
					error: `Unknown function: ${functionName}`
				};
		}
	}

	async _getDirectoryTreeAsText() {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return "No workspace folder is currently open.";
		}

		try {
			const workspacePath = workspaceFolders[0].uri.fsPath;
			const gitignorePatterns = dirTree.readGitignore(workspacePath);
			
			// Send initial progress message
			if (this._view) {
				this._view.webview.postMessage({
					command: 'showProgress',
					text: 'Scanning workspace...'
				});
			}
			
			// Create progress callback
			const progressCallback = (progress) => {
				if (this._view && progress.total % 50 === 0) {
					this._view.webview.postMessage({
						command: 'updateProgress',
						text: `Scanned ${progress.total} items...`
					});
				}
			};
			
			const tree = await dirTree.readDirectoryTree(workspacePath, '', [], 0, gitignorePatterns, progressCallback);
			
			// Send completion message
			if (this._view) {
				this._view.webview.postMessage({
					command: 'updateProgress',
					text: `Scan complete: ${tree.length} items found. Formatting...`
				});
			}
			
			const formattedTree = dirTree.formatTree(tree, workspacePath);
			
			// Clear progress message
			if (this._view) {
				this._view.webview.postMessage({
					command: 'hideProgress'
				});
			}
			
			return formattedTree;
		} catch (error) {
			// Clear progress on error
			if (this._view) {
				this._view.webview.postMessage({
					command: 'hideProgress'
				});
			}
			throw new Error(`Failed to read directory tree: ${error.message}`);
		}
	}

    async _processWithVercelAI() {
		const maxIterations = 5; // Prevent infinite loops
		let iteration = 0;

		while (iteration < maxIterations) {
			iteration++;

			// Prepare messages with system prompt
    const messages = [
				{
					role: 'system',
					content: 'You are a helpful coding assistant in VS Code. You help developers learn and solve coding problems. You have access to tools that let you analyze the codebase structure. Use tools when needed to understand the project better. Be concise, clear, and helpful.'
				},
				...this.conversationHistory
			];

            // Use AI SDK tool calling to let the model call get_directory_tree.
            const gateway = createGateway({ apiKey: this.openaiApiKey, baseUrl: this.gatewayBaseUrl || undefined });
            const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
            const tools = {
                get_directory_tree: tool({
                    description: 'Get the directory tree of the current workspace',
                    inputSchema: z.object({
                        reason: z.string().describe('Reason for needing the tree'),
                    }),
                    execute: async ({ reason }) => {
                        const treeText = await this._getDirectoryTreeAsText();
                        return { tree: treeText, reason };
                    },
                }),
            };

            // Show progress: processing with AI
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'showProgress',
                    text: 'Processing your request with AI...'
                });
            }

            let finalResponse = '';
            try {
                const result = await generateText({
                    model: gateway('openai/gpt-4o'),
                    prompt,
                    tools,
                    maxTokens: 1000,
                    temperature: 0.7,
                });
                finalResponse = (result && typeof result.text === 'string') ? result.text : '';
                if (!finalResponse || !finalResponse.trim()) {
                    console.warn('AI SDK returned empty text. Full result:', JSON.stringify(result, null, 2));
                    finalResponse = 'I could not produce an answer. Please try rephrasing your question.';
                }
            } catch (err) {
                console.error('generateText error:', err && err.message ? err.message : err);
                finalResponse = 'There was an error contacting the AI service. Please check your gateway configuration.';
            }

            this.conversationHistory.push({ role: 'assistant', content: finalResponse });

			// Keep conversation history manageable (last 30 messages to account for tool calls)
			if (this.conversationHistory.length > 30) {
				// Keep system message logic and recent messages
				this.conversationHistory = this.conversationHistory.slice(-30);
			}

			// Send response to webview
			if (this._view) {
				this._view.webview.postMessage({
					command: 'hideProgress'
				});
				
				this._view.webview.postMessage({
					command: 'setTyping',
					typing: false
				});
				
				this._view.webview.postMessage({
					command: 'receiveMessage',
					text: finalResponse,
					isBot: true
				});
			}

            // Exit the loop - we got a final response
            return;
		}

		// If we've iterated too many times, send an error
		if (this._view) {
			this._view.webview.postMessage({
				command: 'hideProgress'
			});
			
			this._view.webview.postMessage({
				command: 'setTyping',
				typing: false
			});
			
			this._view.webview.postMessage({
				command: 'receiveMessage',
				text: 'I apologize, but I encountered an issue processing your request. Please try again.',
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
			
			// Send initial progress message
			webview.postMessage({
				command: 'showProgress',
				text: 'Scanning workspace...'
			});
			
			// Read and parse .gitignore
			const gitignorePatterns = dirTree.readGitignore(workspacePath);
			
			// Create progress callback
			const progressCallback = (progress) => {
				if (progress.total % 50 === 0) {
					webview.postMessage({
						command: 'updateProgress',
						text: `Scanned ${progress.total} items...`
					});
				}
			};
			
			const tree = await dirTree.readDirectoryTree(workspacePath, '', [], 0, gitignorePatterns, progressCallback);
			
			// Update progress with completion
			webview.postMessage({
				command: 'updateProgress',
				text: `Scan complete: ${tree.length} items found. Formatting...`
			});
			
			const formattedTree = dirTree.formatTree(tree, workspacePath);
			
			// Clear progress
			webview.postMessage({
				command: 'hideProgress'
			});
			
			webview.postMessage({
				command: 'receiveMessage',
				text: formattedTree,
				isBot: true,
				isTree: true
			});
		} catch (error) {
			console.error('Error reading directory tree:', error);
			// Clear progress on error
			webview.postMessage({
				command: 'hideProgress'
			});
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

}

module.exports = ConversationProvider;

