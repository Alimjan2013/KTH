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
		// Generate a SIMPLE feature-based mermaid diagram using basic syntax only
		let mermaid = 'graph TD\n';
		
		// If we have features, use them to create simple nodes
		if (features && features.length > 0) {
			const featureGroups = features.slice(0, 8); // Limit to 8 features
			
			// Create simple nodes with single letter IDs
			const nodeIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
			featureGroups.forEach((feature, idx) => {
				if (idx < nodeIds.length) {
					// Clean feature name - remove special characters that might break mermaid
					const cleanFeature = feature.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 25);
					const nodeId = nodeIds[idx];
					mermaid += `    ${nodeId}[${cleanFeature}]\n`;
				}
			});
			
			// Add simple connections between features (linear flow)
			for (let i = 0; i < featureGroups.length - 1 && i < nodeIds.length - 1; i++) {
				mermaid += `    ${nodeIds[i]} --> ${nodeIds[i + 1]}\n`;
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
							if (!potentialFeatures.includes('UI')) potentialFeatures.push('UI');
						}
						if (dirName.includes('db') || dirName.includes('database') || dirName.includes('model')) {
							if (!potentialFeatures.includes('Database')) potentialFeatures.push('Database');
						}
					}
				}
			}
			
			if (potentialFeatures.length > 0) {
				const nodeIds = ['A', 'B', 'C', 'D'];
				potentialFeatures.slice(0, 4).forEach((feature, idx) => {
					if (idx < nodeIds.length) {
						const cleanFeature = feature.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 25);
						mermaid += `    ${nodeIds[idx]}[${cleanFeature}]\n`;
					}
				});
				
				// Add simple connections
				for (let i = 0; i < potentialFeatures.length - 1 && i < 3; i++) {
					mermaid += `    ${nodeIds[i]} --> ${nodeIds[i + 1]}\n`;
				}
			} else {
				// Ultimate fallback: simple generic structure
				mermaid += `    A[Application]\n`;
				mermaid += `    B[Components]\n`;
				mermaid += `    A --> B\n`;
			}
		}
		
		return mermaid;
	}
}

module.exports = new MermaidGenerator();

