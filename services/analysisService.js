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
	 * Stage 1: Fast analysis
	 * Reads files and creates detailed structured analysis
	 */
	async performStage1Analysis(treeText, packageJsonContent) {
		const analysisPrompt = prompts.getStage1AnalysisPrompt(treeText, packageJsonContent);
		const systemMessage = prompts.getStage1SystemMessage();
		
		const availableTools = this.getAvailableTools();
		console.log('=== STAGE 1 API CALL ===');
		console.log('OpenAI client available:', !!this.openai);
		console.log('Available tools:', JSON.stringify(availableTools, null, 2));
		console.log('Tool count:', availableTools ? availableTools.length : 0);
		console.log('Model: xai/grok-4.1-fast-non-reasoning');
		console.log('Prompt length:', analysisPrompt.length);
		console.log('System message length:', systemMessage.length);
		console.log('========================');

		if (!this.openai) {
			throw new Error('OpenAI client is not initialized');
		}

		let stage1Response;
		try {
			stage1Response = await this.openai.chat.completions.create({
				model: 'xai/grok-4.1-fast-non-reasoning',
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
				tools: availableTools,
				tool_choice: 'auto',
				temperature: 0.7,
				max_tokens: 4000
			});
			console.log('API call completed successfully');
		} catch (apiError) {
			console.error('=== API CALL ERROR ===');
			console.error('Error:', apiError);
			console.error('Error message:', apiError.message);
			console.error('Error response:', apiError.response ? JSON.stringify(apiError.response, null, 2) : 'No response');
			console.error('=====================');
			throw apiError;
		}

		// Process Stage 1 response with tool calls if any
		let stage1Content = stage1Response.choices[0].message.content || '';
		const toolCalls = stage1Response.choices[0].message.tool_calls || [];
		
		// Fallback: Use reasoning content if main content is empty (some models provide reasoning)
		if (!stage1Content || stage1Content.trim().length === 0) {
			const reasoning = stage1Response.choices[0].message.reasoning;
			if (reasoning && reasoning.trim().length > 0) {
				console.log('Using reasoning content as fallback');
				stage1Content = reasoning;
			}
		}
		
		// Debug: Print raw Stage 1 response
		console.log('=== STAGE 1 RAW RESPONSE ===');
		console.log('Full response object:', JSON.stringify(stage1Response, null, 2));
		console.log('Content:', stage1Content);
		console.log('Content length:', stage1Content ? stage1Content.length : 0);
		console.log('Tool calls:', toolCalls.length > 0 ? JSON.stringify(toolCalls, null, 2) : 'None');
		console.log('===========================');
		
		// Track all file contents read during analysis
		const fileContentsMap = {};
		
		// Execute tool calls if Stage 1 wants to read files
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
					content: stage1Content,
					tool_calls: toolCalls
				},
				...toolResults
			];

			while (iteration < maxToolCallIterations) {
				const finalResponse = await this.openai.chat.completions.create({
					model: 'xai/grok-4.1-fast-non-reasoning',
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
						stage1Content = responseContent;
						break;
					} else {
						// No content and no tool calls - break
						break;
					}
				}
			}
			
			// Debug: Print final Stage 1 response after tool calls
			console.log('=== STAGE 1 FINAL RESPONSE (after tool calls) ===');
			console.log('Content:', stage1Content);
			console.log('Content length:', stage1Content ? stage1Content.length : 0);
			console.log('===============================================');
		}
		
		// Parse Stage 1 response
		console.log('=== PARSING STAGE 1 RESPONSE ===');
		console.log('Raw content length:', stage1Content ? stage1Content.length : 0);
		console.log('Raw content:', stage1Content);
		
		let jsonText = '';
		let detailedAnalysis = '';
		let features = [];
		
		// If content is empty, we can't parse it
		if (!stage1Content || stage1Content.trim().length === 0) {
			console.error('=== STAGE 1 CONTENT IS EMPTY ===');
			console.error('Stage 1 did not return any content. This might be a model issue.');
			console.error('===========================');
			
			// Return empty analysis - will trigger fallback
			return { detailedAnalysis: '', features: [] };
		}
		
		try {
			const jsonMatch = stage1Content.match(/```json\s*([\s\S]*?)\s*```/) || stage1Content.match(/```\s*([\s\S]*?)\s*```/);
			jsonText = jsonMatch ? jsonMatch[1] : stage1Content;
			
			console.log('Extracted JSON text:', jsonText);
			console.log('JSON text length:', jsonText.length);
			
			const parsed = JSON.parse(jsonText.trim());
			
			console.log('Successfully parsed JSON:', JSON.stringify(parsed, null, 2));
			
			detailedAnalysis = JSON.stringify(parsed, null, 2);
			features = Array.isArray(parsed.features) ? parsed.features : [];
			
			console.log('Extracted features:', features);
			console.log('===================================');
		} catch (parseError) {
			console.error('=== STAGE 1 PARSE ERROR ===');
			console.error('Error:', parseError.message);
			console.error('Stack:', parseError.stack);
			console.error('Attempted to parse:', jsonText || stage1Content);
			console.error('===========================');
			
			// Fallback: Try to extract structured info from text
			// If it's reasoning text, try to parse it as structured content
			detailedAnalysis = stage1Content;
			features = fileUtils.extractFeaturesFromText(stage1Content);
			
			// Try to create a structured object from the text
			try {
				// Look for structured patterns in the text
				const descriptionMatch = stage1Content.match(/(?:description|project|application)[:\s]+([^\n]+)/i);
				const featuresMatch = stage1Content.match(/(?:features?|technologies?)[:\s]+([^\n]+)/gi);
				
				if (descriptionMatch || featuresMatch || features.length > 0) {
					const structured = {
						description: descriptionMatch ? descriptionMatch[1] : stage1Content.substring(0, 200),
						features: features.length > 0 ? features : fileUtils.extractFeaturesFromText(stage1Content),
						note: 'Parsed from text response (not JSON)'
					};
					detailedAnalysis = JSON.stringify(structured, null, 2);
					console.log('Created structured analysis from text:', structured);
				}
			} catch (e) {
				// If all else fails, just use the raw content
				console.log('Using raw Stage 1 content as analysis');
			}
		}

		return { detailedAnalysis, features, fileContents: fileContentsMap };
	}

	/**
	 * Stage 2: Polish and generate mermaid
	 * Takes detailed analysis and creates polished output with mermaid diagrams
	 */
	async performStage2Polishing(detailedAnalysis, features, treeText, packageJsonContent) {
		// Debug: Log what we're sending to Stage 2
		console.log('=== PREPARING STAGE 2 PROMPT ===');
		console.log('Detailed analysis length:', detailedAnalysis ? detailedAnalysis.length : 0);
		console.log('Detailed analysis preview:', detailedAnalysis ? detailedAnalysis.substring(0, 500) : 'EMPTY');
		console.log('Features:', features);
		console.log('Tree text length:', treeText ? treeText.length : 0);
		console.log('Package.json length:', packageJsonContent ? packageJsonContent.length : 0);
		console.log('==================================');
		
		const polishPrompt = prompts.getStage2PolishPrompt(detailedAnalysis, features, treeText, packageJsonContent);
		
		// Debug: Log the full prompt being sent
		console.log('=== STAGE 2 PROMPT (first 2000 chars) ===');
		console.log(polishPrompt.substring(0, 2000));
		console.log('Full prompt length:', polishPrompt.length);
		console.log('==========================================');
		
		const systemMessage = prompts.getStage2SystemMessage();

		const stage2Response = await this.openai.chat.completions.create({
			model: 'xai/grok-4.1-fast-non-reasoning',
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

		const stage2Content = stage2Response.choices[0].message.content;
		
		// Debug: Print raw Stage 2 response
		console.log('=== STAGE 2 RAW RESPONSE ===');
		console.log('Full response object:', JSON.stringify(stage2Response, null, 2));
		console.log('Content:', stage2Content);
		console.log('Content length:', stage2Content.length);
		console.log('=============================');
		
		// Process markdown response
		console.log('=== PROCESSING STAGE 2 MARKDOWN RESPONSE ===');
		
		// Clean up the markdown content (remove any extra formatting if needed)
		let markdownContent = stage2Content.trim();
		
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
			
			// Check cache first for Stage 1 analysis
			sendAnalysisStep('Checking for cached analysis...');
			await this.delay(500);
			
			const cachedResult = analysisCache.loadCache(codebaseHash);
			let detailedAnalysis = '';
			let features = [];
			
			if (cachedResult) {
				console.log('✓ Cache found and valid - SKIPPING Stage 1');
				console.log('Using cached Stage 1 analysis result');
				sendAnalysisStep('Loading cached analysis...');
				await this.delay(500);
				
				// Use cached Stage 1 results
				detailedAnalysis = cachedResult.detailedAnalysis;
				features = cachedResult.features;
				
				// Include file contents in detailedAnalysis if available
				if (cachedResult.fileContents && Object.keys(cachedResult.fileContents).length > 0) {
					console.log(`Cache includes ${Object.keys(cachedResult.fileContents).length} file(s) that were read`);
					// Append file contents to detailedAnalysis for Stage 2
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
				console.log('✗ No valid cache found - RUNNING Stage 1');
				console.log('This will call Stage 1 API to analyze the codebase');
			
				// Step 2: Reading key files with Stage 1
				sendAnalysisStep('Reading and analyzing key project files...');
				await this.delay(1000);
				
				// Read package.json if it exists
				const packageJsonContent = fileUtils.readPackageJson();
				
				// Step 3: Detailed analysis with Stage 1
				sendAnalysisStep('Performing detailed codebase analysis...');
				
				if (this.openai) {
					console.log('OpenAI client is available, calling Stage 1 analysis...');
					try {
						const result = await this.performStage1Analysis(treeText, packageJsonContent);
						console.log('Stage 1 analysis completed successfully');
						console.log('Result:', {
							hasDetailedAnalysis: !!result.detailedAnalysis,
							detailedAnalysisLength: result.detailedAnalysis ? result.detailedAnalysis.length : 0,
							featuresCount: result.features ? result.features.length : 0,
							fileContentsCount: result.fileContents ? Object.keys(result.fileContents).length : 0
						});
						detailedAnalysis = result.detailedAnalysis;
						features = result.features;
						const fileContents = result.fileContents || {};
						
						// Save Stage 1 analysis to cache - includes file contents
						if (detailedAnalysis && detailedAnalysis.trim().length > 0) {
							sendAnalysisStep('Saving analysis to cache...');
							analysisCache.saveCache(codebaseHash, detailedAnalysis, features, fileContents);
							await this.delay(500);
						}
					} catch (stage1Error) {
						console.error('=== STAGE 1 ANALYSIS ERROR ===');
						console.error('Error:', stage1Error);
						console.error('Error message:', stage1Error.message);
						console.error('Error stack:', stage1Error.stack);
						console.error('================================');
						// Fallback
						detailedAnalysis = fileUtils.generateFallbackDescription(treeText, packageJsonContent);
						features = fileUtils.extractFeaturesFromPackageJson(packageJsonContent);
					}
				} else {
					console.warn('OpenAI client is NOT available - using fallback');
					// Fallback when OpenAI is not available
					detailedAnalysis = fileUtils.generateFallbackDescription(treeText, packageJsonContent);
					features = fileUtils.extractFeaturesFromPackageJson(packageJsonContent);
				}
			}
			
			// Read package.json for Stage 2
			const packageJsonContent = fileUtils.readPackageJson();
			
			// Stage 2: Polish and generate mermaid
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
				} catch (stage2Error) {
					console.error('Stage 2 polishing error:', stage2Error);
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
			
			// Note: Cache is already saved after Stage 1 analysis
			// We don't save Stage 2's markdown to cache - we only cache Stage 1's detailedAnalysis
			
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

