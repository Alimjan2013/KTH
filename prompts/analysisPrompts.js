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
2. Identify key files and their purposes
3. Detect technologies, frameworks, and features
4. Create a detailed structured analysis

Directory Tree:
${treeText.substring(0, 4000)}

${packageJsonContent ? `Package.json:\n${packageJsonContent.substring(0, 3000)}` : ''}

Please provide a detailed structured analysis in JSON format:
{
  "description": "A detailed 2-3 sentence description of what this project is",
  "features": ["feature1", "feature2", ...],
  "keyFiles": ["file1", "file2", ...],
  "technologies": ["tech1", "tech2", ...],
  "architecture": "Brief description of architecture patterns",
  "mainComponents": ["component1", "component2", ...]
}`;
	},

	/**
	 * System message for minimax analysis
	 */
	getMinimaxSystemMessage() {
		return 'You are a codebase analysis assistant. Analyze codebases thoroughly and provide detailed structured analysis. Use tools to read files when needed.';
	},

	/**
	 * Prompt for Stage 2: Polish and generate mermaid with moonshotai/kimi-k2-thinking
	 * This model takes the detailed analysis and creates polished output with mermaid diagrams
	 */
	getMoonshotPolishPrompt(detailedAnalysis, features) {
		return `Based on this detailed codebase analysis, create a polished markdown response that includes:
1. A polished, concise description (2-3 sentences) of what type of project this is
2. A feature-based mermaid diagram showing the application's features, pages, or main components and their relationships. Use subgraphs to group related features.

IMPORTANT: 
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

[Your polished description here]

## Features

- Feature 1
- Feature 2

## Architecture Diagram

\`\`\`mermaid
[Your mermaid diagram here]
\`\`\`

Detailed Analysis:
${detailedAnalysis}

${features.length > 0 ? `Detected Features: ${features.join(', ')}` : ''}

Respond in MARKDOWN format (not JSON).`;
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

