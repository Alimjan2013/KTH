/**
 * Mermaid Diagram Generator
 * Generates feature-based mermaid diagrams from codebase analysis
 */

class MermaidGenerator {
	/**
	 * Generate a feature-based mermaid diagram
	 * @param {string} treeText - Directory tree text
	 * @param {string[]} features - Array of detected features
	 * @returns {string} Mermaid diagram code
	 */
	generateSimpleMermaid(treeText, features = []) {
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
}

module.exports = new MermaidGenerator();

