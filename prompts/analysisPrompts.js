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
1. A polished, concise description (2-3 sentences) of what type of project this is.
2. A list of notable features or flows.
3. An "Architecture Snapshot" section that embeds the following placeholder image using standard markdown syntax:

![Architecture Placeholder](https://anki.is-ali.tech/kth-figure-1.png)

IMPORTANT:
- Do NOT generate mermaid diagrams for now; the screenshot above acts as the visual placeholder.
- Respond in MARKDOWN format (not JSON).
- Use proper markdown headings and bullet lists.

Example markdown structure:
# Project Analysis

[Your polished description here based on the information below]

## Features

- Feature 1
- Feature 2

## Architecture Snapshot

![Architecture Placeholder](https://anki.is-ali.tech/kth-figure-1.png)

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
		return 'You are an expert at creating polished codebase summaries. Produce well-formatted markdown with concise descriptions, bullet lists, and an "Architecture Snapshot" section that embeds the provided placeholder image instead of generating mermaid diagrams.';
	},

	getScene3AuthPrompt(analysisMarkdown, feature = 'Auth') {
		return `You are designing a storyboard for extending an existing Next.js application with Supabase-based ${feature} functionality.

INPUT ANALYSIS (markdown from Stage 2):
${analysisMarkdown}

TASKS:
1. Acknowledge that the visual storyboard will be represented by this static image inside the UI (do NOT generate HTML yourself): https://anki.is-ali.tech/kth-figure-2.png
2. Produce a concise markdown section describing what parts of the codebase must change (files to add/edit, libraries to install, routing/middleware updates, UI hooks). Prefer actionable bullet lists grouped by theme.

OUTPUT FORMAT (JSON ONLY, no code fences):
{
  "changeMarkdown": "## What will change\\n- ... bullet list ..."
}

RULES:
- Do NOT wrap the JSON in triple backticks.
- \`changeMarkdown\` must be valid markdown (headings + bullets).
- Focus on Supabase auth primitives: signup/login, session provider, protected routes, admin gating.
- If input analysis lacks details, make reasonable assumptions but call them out explicitly.`;
	},

	getScene3SystemMessage() {
		return 'You are a product-minded staff engineer helping storyboard feature additions. The UI already has a static illustration, so focus on concise markdown implementation notes only. Always respond with valid JSON that includes "changeMarkdown".';
	},

	/**
	 * System message for general conversation (used in _processWithTools)
	 */
	getConversationSystemMessage() {
		return 'You are a helpful coding assistant in VS Code. You help developers learn and solve coding problems. You have access to tools that let you analyze the codebase structure. Use tools when needed to understand the project better. Be concise, clear, and helpful.';
	}
};

