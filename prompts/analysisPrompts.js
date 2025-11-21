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

	getScene3AuthPrompt(analysisMarkdown, feature = 'Auth') {
		const referenceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NextJS Application Diagram</title>
    <style>
        :root {
            --bg-color: #ffffff;
            --text-color: #000000;
            --border-std: #555555;
            --edit-border: #fbc02d;
            --edit-bg: #ffeebf;
            --new-border: #4ade80;
            --new-bg: #d1fae5;
            --auth-bg: #fff5f5;
            --auth-border: #fecaca;
            --auth-tag-bg: #fca5a5;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
        }
        .diagram-card {
            background-color: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 40px;
            padding-top: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            width: 600px;
            position: relative;
        }
        .top-label {
            position: absolute;
            top: -12px;
            left: 0;
            background: #e0e0e0;
            padding: 4px 12px;
            font-size: 12px;
            border-radius: 4px 4px 0 0;
            color: #333;
            font-weight: 500;
        }
        .row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .col-left {
            width: 35%;
            display: flex;
            justify-content: center;
        }
        .col-right {
            width: 55%;
            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: center;
        }
        .box-page {
            border: 2px solid var(--border-std);
            padding: 15px 20px;
            width: 100%;
            text-align: center;
            background: white;
            border-radius: 4px;
            font-size: 18px;
            font-weight: 500;
        }
        .box-feature {
            border: 2px solid var(--border-std);
            padding: 12px 20px;
            width: 100%;
            text-align: center;
            background: white;
            border-radius: 50px;
            font-size: 16px;
        }
        .is-edit {
            background-color: var(--edit-bg);
            border-color: var(--edit-border);
        }
        .is-new {
            background-color: var(--new-bg);
            border-color: var(--new-border);
        }
        .auth-wrapper {
            background-color: var(--auth-bg);
            border: 1px solid var(--auth-border);
            border-radius: 8px;
            padding: 30px 20px 20px 20px;
            position: relative;
            margin-top: 20px;
            margin-bottom: 20px;
        }
        .auth-tag {
            position: absolute;
            top: 0;
            left: 0;
            background-color: var(--auth-tag-bg);
            color: #333;
            font-size: 10px;
            font-weight: bold;
            padding: 3px 8px;
            border-radius: 8px 0 8px 0;
            border: 1px solid var(--auth-border);
        }
        .legend {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin-top: 40px;
            padding-top: 20px;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 16px;
        }
        .legend-box {
            width: 60px;
            height: 25px;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="diagram-card">
        <div class="top-label">NextJS / Gallery application</div>
        <div class="row">
            <div class="col-left">
                <div class="box-page">Home page</div>
            </div>
            <div class="col-right">
                <div class="box-feature is-edit">Menu bar</div>
                <div class="box-feature">Carousel</div>
                <div class="box-feature">selective Albums</div>
            </div>
        </div>
        <div class="auth-wrapper">
            <div class="auth-tag">Auth protect</div>
            <div class="row">
                <div class="col-left">
                    <div class="box-page">Auth page</div>
                </div>
                <div class="col-right">
                    <div class="box-feature is-new">Log In</div>
                    <div class="box-feature is-new">Sign In</div>
                </div>
            </div>
            <div class="row">
                <div class="col-left">
                    <div class="box-page">Album page</div>
                </div>
                <div class="col-right">
                    <div class="box-feature">Image preview</div>
                    <div class="box-feature">Image description</div>
                    <div class="box-feature is-edit">Like content</div>
                    <div class="box-feature is-edit">user comment</div>
                </div>
            </div>
            <div class="row">
                <div class="col-left">
                    <div class="box-page">Admin page</div>
                </div>
                <div class="col-right">
                    <div class="box-feature is-edit">Upload image</div>
                    <div class="box-feature is-edit">Delete image</div>
                </div>
            </div>
        </div>
        <div class="legend">
            <div class="legend-item">
                <div class="legend-box is-edit"></div>
                <span>Edit feature</span>
            </div>
            <div class="legend-item">
                <div class="legend-box is-new"></div>
                <span>New Feature</span>
            </div>
        </div>
    </div>
</body>
</html>`;

		return `You are designing a storyboard for extending an existing Next.js application with Supabase-based ${feature} functionality.

INPUT ANALYSIS (markdown from Stage 2):
${analysisMarkdown}

TASKS:
1. Create a visually rich HTML snippet (no markdown code fences) that illustrates the project "after adding Supabase ${feature}". Use inline CSS similar to the reference template below (card, rows, pill-shaped feature chips, "Auth protect" tag, etc.). You may customize text/content to match the project analysis. Keep it self-contained so it can be rendered inside a DIV via \`innerHTML\`.
2. Produce a concise markdown section describing what parts of the codebase must change (files to add/edit, libraries to install, routing/middleware updates, UI hooks). Prefer actionable bullet lists.

REFERENCE HTML STYLE (for inspiration, do NOT copy verbatim—adapt texts to match the current project):
${referenceHtml}

OUTPUT FORMAT (JSON ONLY):
{
  "diagramHtml": "<!DOCTYPE html>....</html>",
  "changeMarkdown": "## What will change\\n- ... bullet list ..."
}

RULES:
- Do NOT wrap the JSON in triple backticks.
- Ensure \`diagramHtml\` is valid HTML string without escaping newlines (use \\n only if necessary).
- \`changeMarkdown\` must be valid markdown (headings + bullets).
- Focus on Supabase auth primitives: signup/login, session provider, protected routes, admin gating.
- If input analysis lacks details, make reasonable assumptions but call them out explicitly.`;
	},

	getScene3SystemMessage() {
		return 'You are a product-minded staff engineer helping storyboard feature additions. You provide rich HTML sketches (with inline CSS) and concise markdown implementation notes. Always respond with valid JSON that includes "diagramHtml" and "changeMarkdown".';
	},

	/**
	 * System message for general conversation (used in _processWithTools)
	 */
	getConversationSystemMessage() {
		return 'You are a helpful coding assistant in VS Code. You help developers learn and solve coding problems. You have access to tools that let you analyze the codebase structure. Use tools when needed to understand the project better. Be concise, clear, and helpful.';
	}
};

