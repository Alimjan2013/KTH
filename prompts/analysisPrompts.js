/**
 * LLM Prompts for Codebase Analysis
 * This file contains all prompts used for analyzing codebases.
 * Modify these prompts to adjust the analysis behavior.
 */

module.exports = {
	/**
	 * Prompt for Stage 1: Detailed analysis with minimax/minimax-m2
	 * This model reads files and creates a detailed structured analysis
	 */
	getMinimaxAnalysisPrompt(treeText, packageJsonContent) {
		return `You are analyzing a codebase. Your task is to:
1. Read and understand the project structure
2. Identify key files and their purposes (use tools to read important files)
3. Detect technologies, frameworks, and features
4. Create a detailed structured analysis

Directory Tree:
${treeText.substring(0, 4000)}

${packageJsonContent ? `Package.json:\n${packageJsonContent.substring(0, 3000)}` : ''}

IMPORTANT: After reading any files with tools, you MUST provide a complete detailed structured analysis in JSON format. Do not just say you will read files - actually provide the analysis.

The final response MUST be in this JSON format:
{
  "description": "A detailed 2-3 sentence description of what this project is",
  "features": ["feature1", "feature2", ...],
  "keyFiles": ["file1", "file2", ...],
  "technologies": ["tech1", "tech2", ...],
  "architecture": "Brief description of architecture patterns",
  "mainComponents": ["component1", "component2", ...],
  "fileContents": {
    "file1": "summary of what this file does",
    "file2": "summary of what this file does"
  }
}

Provide the complete JSON analysis now.`;
	},

	/**
	 * System message for minimax analysis
	 */
	getMinimaxSystemMessage() {
		return 'You are a codebase analysis assistant. Analyze codebases thoroughly and provide detailed structured analysis. Use tools to read files when needed. After reading files with tools, you MUST provide a complete JSON analysis with all the information you gathered. Do not stop after reading files - always provide the final structured JSON analysis.';
	},

	/**
	 * Prompt for Stage 2: Polish and generate mermaid with moonshotai/kimi-k2-thinking
	 * This model takes the detailed analysis and creates polished output with mermaid diagrams
	 */
	getMoonshotPolishPrompt(detailedAnalysis, features, treeText, packageJsonContent) {
		// Ensure detailedAnalysis is not empty
		if (!detailedAnalysis || detailedAnalysis.trim().length === 0) {
			detailedAnalysis = 'No detailed analysis available from Stage 1. Please analyze the codebase structure from the directory tree and package.json provided below.';
		}
		
		// Build the prompt with all available information
		let prompt = `You are analyzing a codebase. Below is information about the codebase structure, files, and dependencies.

YOUR TASK: Create a polished markdown response based on this information that includes:
1. A polished, concise description (2-3 sentences) of what type of project this is
2. A feature-based mermaid diagram showing the application's features, pages, or main components and their relationships. Use subgraphs to group related features.

IMPORTANT: 
- You MUST analyze the codebase using the information provided below
- Create a FEATURE-BASED diagram (NOT a directory tree). Show how features/pages/components relate to each other.
- Respond in MARKDOWN format (not JSON)
- Include the mermaid diagram in a markdown code block with language "mermaid"
- Use proper markdown formatting for headings, lists, etc.

Example mermaid format:
\`\`\`mermaid
graph TD
    subgraph HomePage["Home page"]
        direction TB
        B[Menu bar]
        C[Carousel]
        D[Selective Albums]
    end
    subgraph AlbumPage["Album page"]
        direction TB
        F[Image preview]
        G[Image description]
    end
    HomePage --> AlbumPage
\`\`\`

Example markdown structure:
# Project Analysis

[Your polished description here based on the information below]

## Features

- Feature 1
- Feature 2

## Architecture Diagram

\`\`\`mermaid
[Your mermaid diagram here]
\`\`\`

=== DETAILED CODEBASE ANALYSIS FROM STAGE 1 ===

${detailedAnalysis}

=== END OF STAGE 1 ANALYSIS ===`;

		// Add directory tree if available
		if (treeText && treeText.trim().length > 0) {
			prompt += `\n\n=== DIRECTORY TREE STRUCTURE ===\n\n${treeText.substring(0, 3000)}\n\n=== END OF DIRECTORY TREE ===`;
		}

		// Add package.json if available
		if (packageJsonContent && packageJsonContent.trim().length > 0) {
			prompt += `\n\n=== PACKAGE.JSON ===\n\n${packageJsonContent.substring(0, 2000)}\n\n=== END OF PACKAGE.JSON ===`;
		}

		// Add features if available
		if (features && features.length > 0) {
			prompt += `\n\nDetected Features: ${features.join(', ')}`;
		}

		// Try to extract file contents from detailedAnalysis if it's JSON
		try {
			const analysisObj = JSON.parse(detailedAnalysis);
			if (analysisObj.fileContents && Object.keys(analysisObj.fileContents).length > 0) {
				prompt += `\n\n=== KEY FILES READ DURING ANALYSIS ===\n\n`;
				for (const [filePath, content] of Object.entries(analysisObj.fileContents)) {
					prompt += `\nFile: ${filePath}\n${content.substring(0, 1500)}\n`;
				}
				prompt += `\n=== END OF KEY FILES ===`;
			}
		} catch (e) {
			// Not JSON, skip file contents extraction
		}

		prompt += `\n\nNow create your polished markdown response based on ALL the information above. Analyze the codebase structure, dependencies, files read, and create a feature-based diagram. Respond in MARKDOWN format (not JSON).`;

		return prompt;
	},

	/**
	 * System message for moonshot polishing
	 */
	getMoonshotSystemMessage() {
		return 'You are an expert at creating polished codebase summaries and feature-based mermaid diagrams. Create well-formatted markdown responses with mermaid diagrams that show application features, pages, or main components grouped in subgraphs with their relationships. DO NOT create directory tree structures. Always format mermaid diagrams in markdown code blocks with language "mermaid".';
	},

	/**
	 * System message for general conversation (used in _processWithTools)
	 */
	getConversationSystemMessage() {
		return 'You are a helpful coding assistant in VS Code. You help developers learn and solve coding problems. You have access to tools that let you analyze the codebase structure. Use tools when needed to understand the project better. Be concise, clear, and helpful.';
	}
};

