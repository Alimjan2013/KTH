/**
 * Analysis Service
 * Handles the two-stage codebase analysis workflow
 */

const prompts = require('../prompts/analysisPrompts');
const fileUtils = require('./fileUtils');
const mermaidGenerator = require('./mermaidGenerator');
const analysisCache = require('./analysisCache');

class AnalysisService {
	constructor(openai, executeTool, getAvailableTools, getDirectoryTreeAsText) {
		this.openai = openai;
		this.executeTool = executeTool;
		this.getAvailableTools = getAvailableTools;
		this.getDirectoryTreeAsText = getDirectoryTreeAsText;
	}

	/**
	 * Delay helper
	 */
	async delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Stage 1: Fast analysis with minimax/minimax-m2
	 * Reads files and creates detailed structured analysis
	 */
	async performStage1Analysis(treeText, packageJsonContent) {
		const analysisPrompt = prompts.getMinimaxAnalysisPrompt(treeText, packageJsonContent);
		const systemMessage = prompts.getMinimaxSystemMessage();

		const minimaxResponse = await this.openai.chat.completions.create({
			model: 'minimax/minimax-m2',
			messages: [
				{
					role: 'system',
					content: systemMessage
				},
				{
					role: 'user',
					content: analysisPrompt
				}
			],
			tools: this.getAvailableTools(),
			tool_choice: 'auto',
			temperature: 0.7,
			max_tokens: 4000
		});

		// Process minimax response with tool calls if any
		let minimaxContent = minimaxResponse.choices[0].message.content || '';
		const toolCalls = minimaxResponse.choices[0].message.tool_calls || [];
		
		// Fallback: Use reasoning content if main content is empty (some models provide reasoning)
		if (!minimaxContent || minimaxContent.trim().length === 0) {
			const reasoning = minimaxResponse.choices[0].message.reasoning;
			if (reasoning && reasoning.trim().length > 0) {
				console.log('Using reasoning content as fallback');
				minimaxContent = reasoning;
			}
		}
		
		// Debug: Print raw minimax response
		console.log('=== MINIMAX RAW RESPONSE ===');
		console.log('Full response object:', JSON.stringify(minimaxResponse, null, 2));
		console.log('Content:', minimaxContent);
		console.log('Content length:', minimaxContent ? minimaxContent.length : 0);
		console.log('Tool calls:', toolCalls.length > 0 ? JSON.stringify(toolCalls, null, 2) : 'None');
		console.log('===========================');
		
		// Track all file contents read during analysis
		const fileContentsMap = {};
		
		// Execute tool calls if minimax wants to read files
		if (toolCalls.length > 0) {
			const toolResults = [];
			for (const toolCall of toolCalls) {
				const functionName = toolCall.function.name;
				let functionArgs;
				try {
					functionArgs = JSON.parse(toolCall.function.arguments);
				} catch (error) {
					console.error('Error parsing function arguments:', error);
					functionArgs = {};
				}
				
				const toolResult = await this.executeTool(functionName, functionArgs);
				
				// Store file contents for caching
				if (functionName === 'read_file_content' && toolResult.success) {
					const filePath = functionArgs.file_path || 'unknown';
					fileContentsMap[filePath] = toolResult.result;
				}
				
				toolResults.push({
					tool_call_id: toolCall.id,
					role: 'tool',
					name: functionName,
					content: toolResult.success ? toolResult.result : `Error: ${toolResult.error}`
				});
			}
			
			// Get final response after tool calls
			// Keep calling until we get a final response (not tool calls)
			let maxToolCallIterations = 3;
			let iteration = 0;
			let currentMessages = [
				{
					role: 'system',
					content: systemMessage
				},
				{
					role: 'user',
					content: analysisPrompt
				},
				{
					role: 'assistant',
					content: minimaxContent,
					tool_calls: toolCalls
				},
				...toolResults
			];

			while (iteration < maxToolCallIterations) {
				const finalResponse = await this.openai.chat.completions.create({
					model: 'minimax/minimax-m2',
					messages: currentMessages,
					tools: this.getAvailableTools(),
					tool_choice: 'auto',
					temperature: 0.7,
					max_tokens: 4000
				});

				const assistantMessage = finalResponse.choices[0].message;
				const newToolCalls = assistantMessage.tool_calls || [];
				
				// If we got content (not just tool calls), check if it's the final analysis
				let responseContent = assistantMessage.content || '';
				
				// Fallback: Use reasoning if content is empty
				if (!responseContent || responseContent.trim().length === 0) {
					responseContent = assistantMessage.reasoning || '';
				}
				
				// Check if this looks like a final analysis (contains JSON or substantial structured content)
				const hasJson = responseContent.includes('{') && responseContent.includes('}');
				const hasStructuredContent = responseContent.length > 200; // Substantial content
				const isBriefMessage = responseContent.length < 200 && !hasJson;
				
				// If there are more tool calls, execute them first
				if (newToolCalls.length > 0) {
					console.log(`Executing ${newToolCalls.length} more tool call(s)...`);
					const newToolResults = [];
					for (const toolCall of newToolCalls) {
						const functionName = toolCall.function.name;
						let functionArgs;
						try {
							functionArgs = JSON.parse(toolCall.function.arguments);
						} catch (error) {
							console.error('Error parsing function arguments:', error);
							functionArgs = {};
						}
						
						console.log(`Executing tool: ${functionName} with args:`, functionArgs);
						const toolResult = await this.executeTool(functionName, functionArgs);
						
						// Store file contents for caching
						if (functionName === 'read_file_content' && toolResult.success) {
							const filePath = functionArgs.file_path || 'unknown';
							fileContentsMap[filePath] = toolResult.result;
						}
						
						newToolResults.push({
							tool_call_id: toolCall.id,
							role: 'tool',
							name: functionName,
							content: toolResult.success ? toolResult.result : `Error: ${toolResult.error}`
						});
					}
					
					// Add to message history
					currentMessages.push({
						role: 'assistant',
						content: assistantMessage.content || '',
						tool_calls: newToolCalls
					});
					currentMessages.push(...newToolResults);
					iteration++;
					
					// After tool calls, explicitly ask for the final analysis
					if (iteration < maxToolCallIterations) {
						currentMessages.push({
							role: 'user',
							content: 'Now that you have read the files, please provide the complete detailed structured analysis in JSON format as requested. Include all the information you gathered from the files. The response must be valid JSON.'
						});
					}
				} else {
					// No more tool calls - check if we have final analysis
					if (responseContent && responseContent.trim().length > 0) {
						// If it's a brief message without JSON, ask for the final analysis
						if (isBriefMessage && !hasJson) {
							console.log('Got brief message, asking for final analysis...');
							currentMessages.push({
								role: 'assistant',
								content: responseContent
							});
							currentMessages.push({
								role: 'user',
								content: 'Please provide the complete detailed structured analysis in JSON format now. Include all the information you gathered.'
							});
							iteration++;
							continue;
						}
						
						// We have substantial content or JSON - use it
						minimaxContent = responseContent;
						break;
					} else {
						// No content and no tool calls - break
						break;
					}
				}
			}
			
			// Debug: Print final minimax response after tool calls
			console.log('=== MINIMAX FINAL RESPONSE (after tool calls) ===');
			console.log('Content:', minimaxContent);
			console.log('Content length:', minimaxContent ? minimaxContent.length : 0);
			console.log('===============================================');
		}
		
		// Parse minimax response
		console.log('=== PARSING MINIMAX RESPONSE ===');
		console.log('Raw content length:', minimaxContent ? minimaxContent.length : 0);
		console.log('Raw content:', minimaxContent);
		
		let jsonText = '';
		let detailedAnalysis = '';
		let features = [];
		
		// If content is empty, we can't parse it
		if (!minimaxContent || minimaxContent.trim().length === 0) {
			console.error('=== MINIMAX CONTENT IS EMPTY ===');
			console.error('Minimax did not return any content. This might be a model issue.');
			console.error('===========================');
			
			// Return empty analysis - will trigger fallback
			return { detailedAnalysis: '', features: [] };
		}
		
		try {
			const jsonMatch = minimaxContent.match(/```json\s*([\s\S]*?)\s*```/) || minimaxContent.match(/```\s*([\s\S]*?)\s*```/);
			jsonText = jsonMatch ? jsonMatch[1] : minimaxContent;
			
			console.log('Extracted JSON text:', jsonText);
			console.log('JSON text length:', jsonText.length);
			
			const parsed = JSON.parse(jsonText.trim());
			
			console.log('Successfully parsed JSON:', JSON.stringify(parsed, null, 2));
			
			detailedAnalysis = JSON.stringify(parsed, null, 2);
			features = Array.isArray(parsed.features) ? parsed.features : [];
			
			console.log('Extracted features:', features);
			console.log('===================================');
		} catch (parseError) {
			console.error('=== MINIMAX PARSE ERROR ===');
			console.error('Error:', parseError.message);
			console.error('Stack:', parseError.stack);
			console.error('Attempted to parse:', jsonText || minimaxContent);
			console.error('===========================');
			
			// Fallback: Try to extract structured info from text
			// If it's reasoning text, try to parse it as structured content
			detailedAnalysis = minimaxContent;
			features = fileUtils.extractFeaturesFromText(minimaxContent);
			
			// Try to create a structured object from the text
			try {
				// Look for structured patterns in the text
				const descriptionMatch = minimaxContent.match(/(?:description|project|application)[:\s]+([^\n]+)/i);
				const featuresMatch = minimaxContent.match(/(?:features?|technologies?)[:\s]+([^\n]+)/gi);
				
				if (descriptionMatch || featuresMatch || features.length > 0) {
					const structured = {
						description: descriptionMatch ? descriptionMatch[1] : minimaxContent.substring(0, 200),
						features: features.length > 0 ? features : fileUtils.extractFeaturesFromText(minimaxContent),
						note: 'Parsed from text response (not JSON)'
					};
					detailedAnalysis = JSON.stringify(structured, null, 2);
					console.log('Created structured analysis from text:', structured);
				}
			} catch (e) {
				// If all else fails, just use the raw content
				console.log('Using raw minimax content as analysis');
			}
		}

		return { detailedAnalysis, features, fileContents: fileContentsMap };
	}

	/**
	 * Stage 2: Polish and generate mermaid with moonshotai/kimi-k2-thinking
	 * Takes detailed analysis and creates polished output with mermaid diagrams
	 */
	async performStage2Polishing(detailedAnalysis, features, treeText, packageJsonContent) {
		// Debug: Log what we're sending to moonshot
		console.log('=== PREPARING MOONSHOT PROMPT ===');
		console.log('Detailed analysis length:', detailedAnalysis ? detailedAnalysis.length : 0);
		console.log('Detailed analysis preview:', detailedAnalysis ? detailedAnalysis.substring(0, 500) : 'EMPTY');
		console.log('Features:', features);
		console.log('Tree text length:', treeText ? treeText.length : 0);
		console.log('Package.json length:', packageJsonContent ? packageJsonContent.length : 0);
		console.log('==================================');
		
		const polishPrompt = prompts.getMoonshotPolishPrompt(detailedAnalysis, features, treeText, packageJsonContent);
		
		// Debug: Log the full prompt being sent
		console.log('=== MOONSHOT PROMPT (first 2000 chars) ===');
		console.log(polishPrompt.substring(0, 2000));
		console.log('Full prompt length:', polishPrompt.length);
		console.log('==========================================');
		
		const systemMessage = prompts.getMoonshotSystemMessage();

		const moonshotResponse = await this.openai.chat.completions.create({
			model: 'moonshotai/kimi-k2-thinking',
			messages: [
				{
					role: 'system',
					content: systemMessage
				},
				{
					role: 'user',
					content: polishPrompt
				}
			],
			temperature: 0.7,
			max_tokens: 10000
		});

		const moonshotContent = moonshotResponse.choices[0].message.content;
		
		// Debug: Print raw moonshot response
		console.log('=== MOONSHOT RAW RESPONSE ===');
		console.log('Full response object:', JSON.stringify(moonshotResponse, null, 2));
		console.log('Content:', moonshotContent);
		console.log('Content length:', moonshotContent.length);
		console.log('=============================');
		
		// Process markdown response
		console.log('=== PROCESSING MOONSHOT MARKDOWN RESPONSE ===');
		
		// Clean up the markdown content (remove any extra formatting if needed)
		let markdownContent = moonshotContent.trim();
		
		// Extract mermaid diagram if it's in a code block (for fallback purposes)
		let extractedMermaid = '';
		const mermaidMatch = markdownContent.match(/```mermaid\s*([\s\S]*?)\s*```/);
		if (mermaidMatch) {
			extractedMermaid = mermaidMatch[1].trim();
			console.log('Found mermaid diagram in markdown code block');
		}
		
		// If no mermaid found, try to generate one as fallback
		if (!extractedMermaid) {
			console.log('No mermaid diagram found in markdown, generating fallback');
			const fallbackMermaid = mermaidGenerator.generateSimpleMermaid(treeText, features);
			// Append fallback mermaid to markdown if not present
			if (!markdownContent.includes('```mermaid')) {
				markdownContent += '\n\n## Architecture Diagram\n\n```mermaid\n' + fallbackMermaid + '\n```';
			}
		}
		
		console.log('Markdown content length:', markdownContent.length);
		console.log('Markdown preview (first 500 chars):', markdownContent.substring(0, 500));
		console.log('==================================');
		
		// Return markdown content directly (will be rendered by Streamdown in webview)
		return { markdownContent };
	}

	/**
	 * Perform complete two-stage analysis
	 * Checks cache first to avoid expensive LLM calls
	 */
	async performAnalysis(sendAnalysisStep, webview) {
		try {
			// Step 1: Reading directory tree
			sendAnalysisStep('Reading directory tree from codebase...');
			await this.delay(1000);
			
			const treeText = await this.getDirectoryTreeAsText();
			
			// Generate codebase hash for cache validation
			const codebaseHash = await analysisCache.generateCodebaseHash(treeText);
			console.log('=== CACHE CHECK IN ANALYSIS SERVICE ===');
			console.log('Generated codebase hash:', codebaseHash);
			console.log('Tree text length:', treeText.length);
			
			// Check cache first for minimax analysis (Stage 1)
			sendAnalysisStep('Checking for cached analysis...');
			await this.delay(500);
			
			const cachedResult = analysisCache.loadCache(codebaseHash);
			let detailedAnalysis = '';
			let features = [];
			
			if (cachedResult) {
				console.log('✓ Cache found and valid - SKIPPING Stage 1 (minimax)');
				console.log('Using cached minimax analysis result');
				sendAnalysisStep('Loading cached analysis...');
				await this.delay(500);
				
				// Use cached minimax results
				detailedAnalysis = cachedResult.detailedAnalysis;
				features = cachedResult.features;
				
				// Include file contents in detailedAnalysis if available
				if (cachedResult.fileContents && Object.keys(cachedResult.fileContents).length > 0) {
					console.log(`Cache includes ${Object.keys(cachedResult.fileContents).length} file(s) that were read`);
					// Append file contents to detailedAnalysis for moonshot
					try {
						const analysisObj = JSON.parse(detailedAnalysis);
						analysisObj.fileContents = cachedResult.fileContents;
						detailedAnalysis = JSON.stringify(analysisObj, null, 2);
					} catch (e) {
						// If not JSON, append as text
						detailedAnalysis += '\n\n=== Files Read During Analysis ===\n';
						for (const [filePath, content] of Object.entries(cachedResult.fileContents)) {
							detailedAnalysis += `\nFile: ${filePath}\n${content.substring(0, 1000)}...\n`;
						}
					}
				}
			} else {
				console.log('✗ No valid cache found - RUNNING Stage 1 (minimax)');
				console.log('This will call minimax API to analyze the codebase');
			
				// Step 2: Reading key files with minimax
				sendAnalysisStep('Reading and analyzing key project files...');
				await this.delay(1000);
				
				// Read package.json if it exists
				const packageJsonContent = fileUtils.readPackageJson();
				
				// Step 3: Detailed analysis with minimax (fast model)
				sendAnalysisStep('Performing detailed codebase analysis...');
				
				if (this.openai) {
					try {
						const result = await this.performStage1Analysis(treeText, packageJsonContent);
						detailedAnalysis = result.detailedAnalysis;
						features = result.features;
						const fileContents = result.fileContents || {};
						
						// Save minimax analysis to cache (Stage 1 result) - includes file contents
						if (detailedAnalysis && detailedAnalysis.trim().length > 0) {
							sendAnalysisStep('Saving analysis to cache...');
							analysisCache.saveCache(codebaseHash, detailedAnalysis, features, fileContents);
							await this.delay(500);
						}
					} catch (minimaxError) {
						console.error('Minimax analysis error:', minimaxError);
						// Fallback
						detailedAnalysis = fileUtils.generateFallbackDescription(treeText, packageJsonContent);
						features = fileUtils.extractFeaturesFromPackageJson(packageJsonContent);
					}
				} else {
					// Fallback when OpenAI is not available
					detailedAnalysis = fileUtils.generateFallbackDescription(treeText, packageJsonContent);
					features = fileUtils.extractFeaturesFromPackageJson(packageJsonContent);
				}
			}
			
			// Read package.json for Stage 2 (needed for moonshot prompt)
			const packageJsonContent = fileUtils.readPackageJson();
			
			// Stage 2: Polish and generate mermaid with moonshotai/kimi-k2-thinking
			sendAnalysisStep('Polishing analysis and generating feature diagram...');
			
			// Validate detailedAnalysis before passing to Stage 2
			if (!detailedAnalysis || detailedAnalysis.trim().length === 0) {
				console.warn('Detailed analysis is empty, using fallback');
				detailedAnalysis = JSON.stringify({
					description: fileUtils.generateFallbackDescription(treeText, packageJsonContent),
					features: features,
					technologies: fileUtils.extractFeaturesFromPackageJson(packageJsonContent),
					note: 'Analysis generated from directory structure and package.json'
				}, null, 2);
			}
			
			// If features array is empty, try to extract from package.json
			if (!features || features.length === 0) {
				features = fileUtils.extractFeaturesFromPackageJson(packageJsonContent);
				console.log('Extracted features from package.json:', features);
			}
			
			let markdownContent = '';
			
			if (this.openai) {
				try {
					const result = await this.performStage2Polishing(detailedAnalysis, features, treeText, packageJsonContent);
					markdownContent = result.markdownContent;
				} catch (moonshotError) {
					console.error('Moonshot polishing error:', moonshotError);
					// Fallback: create simple markdown with fallback description and mermaid
					const fallbackDesc = detailedAnalysis.substring(0, 500);
					const fallbackMermaid = mermaidGenerator.generateSimpleMermaid(treeText, features);
					markdownContent = `${fallbackDesc}\n\n## Architecture Diagram\n\n\`\`\`mermaid\n${fallbackMermaid}\n\`\`\``;
				}
			} else {
				// Fallback when OpenAI is not available
				const fallbackDesc = detailedAnalysis.substring(0, 500);
				const fallbackMermaid = mermaidGenerator.generateSimpleMermaid(treeText, features);
				markdownContent = `${fallbackDesc}\n\n## Architecture Diagram\n\n\`\`\`mermaid\n${fallbackMermaid}\n\`\`\``;
			}
			
			// Note: Cache is already saved after Stage 1 (minimax analysis)
			// We don't save moonshot's markdown to cache - we only cache minimax's detailedAnalysis
			
			// Debug: Print final result
			console.log('=== FINAL ANALYSIS RESULT ===');
			console.log('Markdown content length:', markdownContent.length);
			console.log('Markdown preview (first 500 chars):', markdownContent.substring(0, 500));
			console.log('Features:', features);
			console.log('=============================');
			
			return {
				markdown: markdownContent,
				features: features,
				fromCache: false
			};
		} catch (error) {
			console.error('Analysis error:', error);
			throw error;
		}
	}
}

module.exports = AnalysisService;

