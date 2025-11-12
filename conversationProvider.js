const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const dirTree = require('./services/dirTree');
const { getReactHtml } = require('./ui/conversationHtml');

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
				baseURL: 'https://ai-gateway.vercel.sh/v1',
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
					case 'startAnalysis':
						this._startAnalysis(webviewView.webview);
						return;
				}
			},
			null,
			this.context.subscriptions
		);
	}

	_loadInitialMockData(webview) {
		// No initial message needed for scene-based UI
	}

	async _startAnalysis(webview) {
		try {
			// Step 1: Reading directory tree
			this._sendAnalysisStep(webview, 'Reading directory tree from codebase...');
			await this._delay(1000);
			
			const treeText = await this._getDirectoryTreeAsText();
			
			// Step 2: Analyzing project structure
			this._sendAnalysisStep(webview, 'Analyzing project structure...');
			await this._delay(1000);
			
			// Step 3: Reading key files
			this._sendAnalysisStep(webview, 'Reading key configuration files...');
			await this._delay(1000);
			
			// Read package.json if it exists
			let packageJsonContent = '';
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (workspaceFolders && workspaceFolders.length > 0) {
				const workspacePath = workspaceFolders[0].uri.fsPath;
				const packageJsonPath = path.join(workspacePath, 'package.json');
				if (fs.existsSync(packageJsonPath)) {
					packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
				}
			}
			
			// Step 4: Analyzing dependencies and features
			this._sendAnalysisStep(webview, 'Analyzing dependencies and features...');
			await this._delay(1000);
			
			// Step 5: Generating codebase summary
			this._sendAnalysisStep(webview, 'Generating codebase summary...');
			await this._delay(1000);
			
			// Use OpenAI to analyze the codebase
			let analysisDescription = '';
			let features = [];
			let mermaidDiagram = '';
			
			if (this.openai && this.openaiApiKey) {
				try {
					const analysisPrompt = `Analyze this codebase and provide:
1. A brief description (2-3 sentences) of what type of project this is
2. A list of key features/technologies detected (as a JSON array)
3. A mermaid diagram showing the FEATURE-BASED structure (NOT a directory tree structure). Show the application's features, pages, or main components and their relationships. Use subgraphs to group related features. Example format:

graph TD
    subgraph Feature1["Feature Name"]
        direction TB
        A[Component A]
        B[Component B]
    end
    subgraph Feature2["Another Feature"]
        direction TB
        C[Component C]
    end
    Feature1 --> Feature2

Directory Tree:
${treeText.substring(0, 3000)}

${packageJsonContent ? `Package.json:\n${packageJsonContent.substring(0, 2000)}` : ''}

Respond in JSON format:
{
  "description": "...",
  "features": ["feature1", "feature2", ...],
  "mermaid": "graph TD\n  ..."
}`;

					const response = await this.openai.chat.completions.create({
						model: 'minimax/minimax-m2',
						messages: [
							{
								role: 'system',
								content: 'You are a codebase analysis assistant. Analyze codebases and provide structured summaries with feature-based mermaid diagrams. Create diagrams that show application features, pages, or main components grouped in subgraphs, NOT directory tree structures.'
							},
							{
								role: 'user',
								content: analysisPrompt
							}
						],
						temperature: 0.7,
						max_tokens: 2000
					});

					const content = response.choices[0].message.content;
					
					// Try to parse JSON from the response
					try {
						// Extract JSON from markdown code blocks if present
						const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
						const jsonText = jsonMatch ? jsonMatch[1] : content;
						const parsed = JSON.parse(jsonText.trim());
						
						analysisDescription = parsed.description || 'This is a codebase project.';
						features = Array.isArray(parsed.features) ? parsed.features : [];
						mermaidDiagram = parsed.mermaid || this._generateSimpleMermaid(treeText, features);
					} catch (parseError) {
						// Fallback: extract information from text response
						analysisDescription = content.substring(0, 500);
						features = this._extractFeaturesFromText(content);
						mermaidDiagram = this._generateSimpleMermaid(treeText, features);
					}
				} catch (openaiError) {
					console.error('OpenAI analysis error:', openaiError);
					// Fallback analysis
					analysisDescription = this._generateFallbackDescription(treeText, packageJsonContent);
					features = this._extractFeaturesFromPackageJson(packageJsonContent);
					mermaidDiagram = this._generateSimpleMermaid(treeText, features);
				}
			} else {
				// Fallback when OpenAI is not available
				analysisDescription = this._generateFallbackDescription(treeText, packageJsonContent);
				features = this._extractFeaturesFromPackageJson(packageJsonContent);
				mermaidDiagram = this._generateSimpleMermaid(treeText, features);
			}
			
			// Send final result
			webview.postMessage({
				command: 'analysisComplete',
				description: analysisDescription,
				features: features,
				mermaid: mermaidDiagram
			});
		} catch (error) {
			console.error('Analysis error:', error);
			webview.postMessage({
				command: 'analysisError',
				error: error.message
			});
		}
	}

	_sendAnalysisStep(webview, step) {
		webview.postMessage({
			command: 'analysisStep',
			step: step
		});
	}

	_delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	_generateFallbackDescription(treeText, packageJsonContent) {
		let description = 'This is a codebase project.';
		
		if (packageJsonContent) {
			try {
				const pkg = JSON.parse(packageJsonContent);
				if (pkg.name) {
					description = `This is a ${pkg.name} project.`;
				}
				if (pkg.description) {
					description += ` ${pkg.description}`;
				}
			} catch (e) {
				// Ignore parse errors
			}
		}
		
		// Detect framework from tree structure
		if (treeText.includes('node_modules')) {
			description += ' It uses Node.js and npm dependencies.';
		}
		if (treeText.includes('src/') || treeText.includes('components/')) {
			description += ' The project has a structured source code organization.';
		}
		
		return description;
	}

	_extractFeaturesFromPackageJson(packageJsonContent) {
		const features = [];
		if (!packageJsonContent) return features;
		
		try {
			const pkg = JSON.parse(packageJsonContent);
			const deps = { ...pkg.dependencies, ...pkg.devDependencies };
			
			// Detect common features
			if (deps['react'] || deps['@react']) features.push('React');
			if (deps['vue']) features.push('Vue.js');
			if (deps['express']) features.push('Express.js');
			if (deps['next']) features.push('Next.js');
			if (deps['typescript']) features.push('TypeScript');
			if (deps['tailwindcss']) features.push('Tailwind CSS');
			if (deps['@supabase/supabase-js']) features.push('Supabase');
			if (deps['mongodb'] || deps['mongoose']) features.push('MongoDB');
			if (deps['pg'] || deps['postgresql']) features.push('PostgreSQL');
		} catch (e) {
			// Ignore parse errors
		}
		
		return features;
	}

	_extractFeaturesFromText(text) {
		const features = [];
		const lowerText = text.toLowerCase();
		
		// Simple keyword detection
		if (lowerText.includes('react')) features.push('React');
		if (lowerText.includes('vue')) features.push('Vue.js');
		if (lowerText.includes('express')) features.push('Express.js');
		if (lowerText.includes('next')) features.push('Next.js');
		if (lowerText.includes('typescript')) features.push('TypeScript');
		
		return features;
	}

	_generateSimpleMermaid(treeText, features = []) {
		// Generate a feature-based mermaid diagram
		let mermaid = 'graph TD\n';
		
		// If we have features, use them to create feature-based subgraphs
		if (features && features.length > 0) {
			const featureGroups = features.slice(0, 5); // Limit to 5 features
			
			featureGroups.forEach((feature, idx) => {
				const featureId = `Feature${idx}`;
				const featureName = feature.length > 30 ? feature.substring(0, 30) : feature;
				mermaid += `\n    subgraph ${featureId}["${featureName}"]\n`;
				mermaid += `        direction TB\n`;
				mermaid += `        ${featureId}_A[${featureName} Component]\n`;
				mermaid += `    end\n`;
			});
			
			// Add connections between features
			for (let i = 0; i < featureGroups.length - 1; i++) {
				mermaid += `    Feature${i} --> Feature${i + 1}\n`;
			}
		} else {
			// Fallback: try to infer features from directory structure
			const lines = treeText.split('\n').filter(line => line.trim());
			const potentialFeatures = [];
			
			// Look for common feature indicators in directory names
			for (const line of lines) {
				if (line.includes('📁')) {
					const match = line.match(/[├└│─\s]*📁\s*(.+)/);
					if (match) {
						const dirName = match[1].trim().toLowerCase();
						// Common feature patterns
						if (dirName.includes('auth') || dirName.includes('login') || dirName.includes('user')) {
							if (!potentialFeatures.includes('Authentication')) potentialFeatures.push('Authentication');
						}
						if (dirName.includes('api') || dirName.includes('route')) {
							if (!potentialFeatures.includes('API')) potentialFeatures.push('API');
						}
						if (dirName.includes('page') || dirName.includes('view') || dirName.includes('component')) {
							if (!potentialFeatures.includes('UI Components')) potentialFeatures.push('UI Components');
						}
						if (dirName.includes('db') || dirName.includes('database') || dirName.includes('model')) {
							if (!potentialFeatures.includes('Database')) potentialFeatures.push('Database');
						}
					}
				}
			}
			
			if (potentialFeatures.length > 0) {
				potentialFeatures.slice(0, 4).forEach((feature, idx) => {
					const featureId = `Feature${idx}`;
					mermaid += `\n    subgraph ${featureId}["${feature}"]\n`;
					mermaid += `        direction TB\n`;
					mermaid += `        ${featureId}_A[${feature} Module]\n`;
					mermaid += `    end\n`;
				});
				
				// Add connections
				for (let i = 0; i < potentialFeatures.length - 1 && i < 3; i++) {
					mermaid += `    Feature${i} --> Feature${i + 1}\n`;
				}
			} else {
				// Ultimate fallback: generic structure
				mermaid += `    subgraph App["Application"]\n`;
				mermaid += `        direction TB\n`;
				mermaid += `        A[Main Module]\n`;
				mermaid += `    end\n`;
			}
		}
		
		return mermaid;
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
			await this._processWithTools();
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
			},
			{
				type: 'function',
				function: {
					name: 'read_file_content',
					description: 'Read the content of a file from the current workspace. Use this after viewing the directory tree when you need to inspect specific implementation details (e.g., auth flows). Provide a workspace-relative path like "src/auth/index.ts" or an absolute path within the workspace.',
					parameters: {
						type: 'object',
						properties: {
							file_path: {
								type: 'string',
								description: 'Workspace-relative or absolute file path to read.'
							},
							reason: {
								type: 'string',
								description: 'Brief reason why this file needs to be read (e.g., "inspect auth middleware").'
							},
							max_bytes: {
								type: 'number',
								description: 'Optional limit for returned content size. Defaults to 20000 bytes.',
								minimum: 1000
							}
						},
						required: ['file_path', 'reason']
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
			case 'read_file_content':
				try {
					const { file_path, max_bytes } = arguments_ || {};
					if (!file_path || typeof file_path !== 'string') {
						return { success: false, error: 'file_path is required and must be a string.' };
					}

					const workspaceFolders = vscode.workspace.workspaceFolders;
					if (!workspaceFolders || workspaceFolders.length === 0) {
						return { success: false, error: 'No workspace folder is currently open.' };
					}

					const workspacePath = workspaceFolders[0].uri.fsPath;
					const resolvedPath = path.isAbsolute(file_path) ? file_path : path.join(workspacePath, file_path);
					const normalizedResolved = path.normalize(resolvedPath);

					// Ensure the resolved path is within the workspace root
					if (!normalizedResolved.startsWith(path.normalize(workspacePath + path.sep))) {
						return { success: false, error: 'Access denied: Path is outside of the workspace.' };
					}

					if (!fs.existsSync(normalizedResolved)) {
						return { success: false, error: `File not found: ${file_path}` };
					}

					const stat = fs.statSync(normalizedResolved);
					if (!stat.isFile()) {
						return { success: false, error: 'Path is not a file.' };
					}

					const limit = typeof max_bytes === 'number' && max_bytes >= 1000 ? max_bytes : 20000;
					let content = fs.readFileSync(normalizedResolved);

					// Basic binary detection: presence of null byte
					const isBinary = content.includes(0);
					if (isBinary) {
						return { success: false, error: 'Binary file detected; cannot display as text.' };
					}

					let text = content.toString('utf8');
					let truncatedNote = '';
					if (Buffer.byteLength(text, 'utf8') > limit) {
						// Truncate by bytes to avoid splitting multi-byte chars incorrectly
						let bytes = Buffer.from(text, 'utf8').subarray(0, limit);
						text = bytes.toString('utf8');
						truncatedNote = `\n\n[Truncated output to ${limit} bytes]`;
					}

					const relative = path.relative(workspacePath, normalizedResolved) || path.basename(normalizedResolved);
					const header = `File: ${relative}`;
					return { success: true, result: `${header}\n\n\u0060\u0060\u0060\n${text}\n\u0060\u0060\u0060${truncatedNote}` };
				} catch (error) {
					return { success: false, error: `Error reading file: ${error.message}` };
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
			const tree = await dirTree.readDirectoryTree(workspacePath, '', [], 0, gitignorePatterns);
			const formattedTree = dirTree.formatTree(tree, workspacePath);
			return formattedTree;
		} catch (error) {
			throw new Error(`Failed to read directory tree: ${error.message}`);
		}
	}

	async _processWithTools() {
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

			// Call OpenAI API with tools
			const response = await this.openai.chat.completions.create({
				model: 'moonshotai/kimi-k2-thinking',
				messages: messages,
				tools: this._getAvailableTools(),
				tool_choice: 'auto',
				temperature: 0.7,
				max_tokens: 10000
			});

			const assistantMessage = response.choices[0].message;

			// Check if the model wants to call a function
			if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
				// Add assistant message with tool calls to history
				this.conversationHistory.push({
					role: 'assistant',
					content: assistantMessage.content,
					tool_calls: assistantMessage.tool_calls
				});

				// Execute all tool calls
				const toolResults = [];
				for (const toolCall of assistantMessage.tool_calls) {
					const functionName = toolCall.function.name;
					let functionArgs;
					try {
						functionArgs = JSON.parse(toolCall.function.arguments);
					} catch (error) {
						console.error('Error parsing function arguments:', error);
						functionArgs = {};
					}

					console.log(`Executing tool: ${functionName} with args:`, functionArgs);

					// Execute the tool
					const toolResult = await this._executeTool(functionName, functionArgs);
					
					// Add tool result to conversation
					toolResults.push({
						tool_call_id: toolCall.id,
						role: 'tool',
						name: functionName,
						content: toolResult.success 
							? toolResult.result 
							: `Error: ${toolResult.error}`
					});
				}

				// Add tool results to conversation history
				this.conversationHistory.push(...toolResults);

				// Continue the loop to get the final response from the model
				continue;
			}

			// Model provided a regular response (no tool calls)
			const finalResponse = assistantMessage.content || 'I apologize, but I couldn\'t generate a response.';

			// Add assistant response to history
			this.conversationHistory.push({
				role: 'assistant',
				content: finalResponse
			});

			// Keep conversation history manageable (last 30 messages to account for tool calls)
			if (this.conversationHistory.length > 30) {
				// Keep system message logic and recent messages
				this.conversationHistory = this.conversationHistory.slice(-30);
			}

			// Send response to webview
			if (this._view) {
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
			// Read and parse .gitignore
			const gitignorePatterns = dirTree.readGitignore(workspacePath);
			const tree = await dirTree.readDirectoryTree(workspacePath, '', [], 0, gitignorePatterns);
			const formattedTree = dirTree.formatTree(tree, workspacePath);
			
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

}

module.exports = ConversationProvider;

