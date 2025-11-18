/**
 * Analysis Service
 * Handles the two-stage codebase analysis workflow
 */

const prompts = require('../prompts/analysisPrompts');
const fileUtils = require('./fileUtils');
const mermaidGenerator = require('./mermaidGenerator');

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
		
		// Debug: Print raw minimax response
		console.log('=== MINIMAX RAW RESPONSE ===');
		console.log('Full response object:', JSON.stringify(minimaxResponse, null, 2));
		console.log('Content:', minimaxContent);
		console.log('Tool calls:', toolCalls.length > 0 ? JSON.stringify(toolCalls, null, 2) : 'None');
		console.log('===========================');
		
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
				toolResults.push({
					tool_call_id: toolCall.id,
					role: 'tool',
					name: functionName,
					content: toolResult.success ? toolResult.result : `Error: ${toolResult.error}`
				});
			}
			
			// Get final response after tool calls
			const finalResponse = await this.openai.chat.completions.create({
				model: 'minimax/minimax-m2',
				messages: [
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
				],
				temperature: 0.7,
				max_tokens: 4000
			});
			
			minimaxContent = finalResponse.choices[0].message.content || '';
			
			// Debug: Print final minimax response after tool calls
			console.log('=== MINIMAX FINAL RESPONSE (after tool calls) ===');
			console.log('Content:', minimaxContent);
			console.log('===============================================');
		}
		
		// Parse minimax response
		console.log('=== PARSING MINIMAX RESPONSE ===');
		console.log('Raw content length:', minimaxContent.length);
		console.log('Raw content:', minimaxContent);
		
		let jsonText = '';
		let detailedAnalysis = '';
		let features = [];
		
		try {
			const jsonMatch = minimaxContent.match(/```json\s*([\s\S]*?)\s*```/) || minimaxContent.match(/```\s*([\s\S]*?)\s*```/);
			jsonText = jsonMatch ? jsonMatch[1] : minimaxContent;
			
			console.log('Extracted JSON text:', jsonText);
			
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
			
			// Fallback parsing
			detailedAnalysis = minimaxContent;
			features = fileUtils.extractFeaturesFromText(minimaxContent);
		}

		return { detailedAnalysis, features };
	}

	/**
	 * Stage 2: Polish and generate mermaid with moonshotai/kimi-k2-thinking
	 * Takes detailed analysis and creates polished output with mermaid diagrams
	 */
	async performStage2Polishing(detailedAnalysis, features, treeText) {
		const polishPrompt = prompts.getMoonshotPolishPrompt(detailedAnalysis, features);
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
	 */
	async performAnalysis(sendAnalysisStep, webview) {
		try {
			// Stage 1: Fast analysis with minimax/minimax-m2
			// Step 1: Reading directory tree
			sendAnalysisStep('Reading directory tree from codebase...');
			await this.delay(1000);
			
			const treeText = await this.getDirectoryTreeAsText();
			
			// Step 2: Reading key files with minimax
			sendAnalysisStep('Reading and analyzing key project files...');
			await this.delay(1000);
			
			// Read package.json if it exists
			const packageJsonContent = fileUtils.readPackageJson();
			
			// Step 3: Detailed analysis with minimax (fast model)
			sendAnalysisStep('Performing detailed codebase analysis...');
			
			let detailedAnalysis = '';
			let features = [];
			
			if (this.openai) {
				try {
					const result = await this.performStage1Analysis(treeText, packageJsonContent);
					detailedAnalysis = result.detailedAnalysis;
					features = result.features;
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
			
			// Stage 2: Polish and generate mermaid with moonshotai/kimi-k2-thinking
			sendAnalysisStep('Polishing analysis and generating feature diagram...');
			
			let markdownContent = '';
			
			if (this.openai) {
				try {
					const result = await this.performStage2Polishing(detailedAnalysis, features, treeText);
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
			
			// Debug: Print final result
			console.log('=== FINAL ANALYSIS RESULT ===');
			console.log('Markdown content length:', markdownContent.length);
			console.log('Markdown preview (first 500 chars):', markdownContent.substring(0, 500));
			console.log('Features:', features);
			console.log('=============================');
			
			return {
				markdown: markdownContent,
				features: features
			};
		} catch (error) {
			console.error('Analysis error:', error);
			throw error;
		}
	}
}

module.exports = AnalysisService;

