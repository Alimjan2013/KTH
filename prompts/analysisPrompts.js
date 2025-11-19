/**
 * LLM Prompts for Codebase Analysis
 * This file contains all prompts used for analyzing codebases.
 * Modify these prompts to adjust the analysis behavior.
 */

module.exports = {
	/**
	 * Prompt for Stage 1: Detailed analysis
	 * This stage reads files and creates a detailed structured analysis
	 */
	getStage1AnalysisPrompt(treeText, packageJsonContent) {
		return `You are analyzing a codebase. Follow these steps EXACTLY:

STEP 1: USE TOOLS TO READ FILES
- You MUST use the read_file_content tool to read at least 3-5 key files from the codebase
- Look at the directory tree below and identify important files (e.g., main entry points, config files, component files, API routes)
- Use the read_file_content tool for each important file you identify
- DO NOT skip this step - you cannot provide accurate analysis without reading the actual code

STEP 2: ANALYZE WHAT YOU READ
- After reading files with tools, analyze the code structure, patterns, and functionality
- Identify technologies, frameworks, features, and architecture patterns

STEP 3: PROVIDE JSON ANALYSIS
- After reading files, provide a complete detailed structured analysis in JSON format

Directory Tree:
${treeText.substring(0, 4000)}

${packageJsonContent ? `Package.json:\n${packageJsonContent.substring(0, 3000)}` : ''}

CRITICAL: You MUST use the read_file_content tool FIRST before providing any analysis. Start by calling the tool to read key files from the directory tree above.

After reading files, your final response MUST be in this JSON format:
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

Remember: Use tools FIRST, then provide the JSON analysis.`;
	},

	/**
	 * System message for Stage 1 analysis
	 */
	getStage1SystemMessage() {
		return 'You are a codebase analysis assistant. You MUST use the read_file_content tool to read actual code files before providing analysis. Do not provide analysis based only on file names - you must read the file contents using tools first. After reading files with tools, always provide a complete JSON analysis with all the information you gathered.';
	},

	/**
	 * Prompt for Stage 2: Polish and generate mermaid
	 * This stage takes the detailed analysis and creates polished output with mermaid diagrams
	 */
	getStage2PolishPrompt(detailedAnalysis, features, treeText, packageJsonContent) {
		// Ensure detailedAnalysis is not empty
		if (!detailedAnalysis || detailedAnalysis.trim().length === 0) {
			detailedAnalysis = 'No detailed analysis available from Stage 1. Please analyze the codebase structure from the directory tree and package.json provided below.';
		}
		
		// Build the prompt with all available information
		let prompt = `You are analyzing a codebase. Below is information about the codebase structure, files, and dependencies.

YOUR TASK: Create a polished markdown response based on this information that includes:
1. A polished, concise description (2-3 sentences) of what type of project this is
2. A SIMPLE feature-based mermaid diagram showing the main features or pages

IMPORTANT: 
- You MUST analyze the codebase using the information provided below
- Create a FEATURE-BASED diagram (NOT a directory tree). Show main features or pages.
- Respond in MARKDOWN format (not JSON)
- Include the mermaid diagram in a markdown code block with language "mermaid"
- Use proper markdown formatting for headings, lists, etc.
- KEEP THE MERMAID DIAGRAM SIMPLE - use basic syntax only, avoid complex features

MERMAID RULES (CRITICAL - FOLLOW THESE EXACTLY):
- Use simple graph syntax: graph TD or graph LR
- Use simple node labels: A[Label] or B[Feature Name]
- Use simple connections: A --> B
- NO special characters in labels (no quotes, no brackets inside brackets, no line breaks)
- NO subgraphs with direction
- NO complex styling
- Keep node IDs simple (single letters or simple words)
- Maximum 10-15 nodes total

Example mermaid format (SIMPLE):
\`\`\`mermaid
graph TD
    A[Home Page]
    B[Albums Page]
    C[Admin Page]
    D[Image Gallery]
    A --> B
    B --> D
    C --> D
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
	 * System message for Stage 2 polishing
	 */
	getStage2SystemMessage() {
		return 'You are an expert at creating polished codebase summaries and SIMPLE mermaid diagrams. Create well-formatted markdown responses with SIMPLE mermaid diagrams that show main features or pages. Use ONLY basic mermaid syntax: graph TD/LR, simple node labels like A[Label], and simple connections like A --> B. NO subgraphs, NO special characters, NO complex styling. Keep diagrams simple and error-free. DO NOT create directory tree structures. Always format mermaid diagrams in markdown code blocks with language "mermaid".';
	},

	/**
	 * System message for general conversation (used in _processWithTools)
	 */
	getConversationSystemMessage() {
		return 'You are a helpful coding assistant in VS Code. You help developers learn and solve coding problems. You have access to tools that let you analyze the codebase structure. Use tools when needed to understand the project better. Be concise, clear, and helpful.';
	}
};

