/**
 * File Utilities
 * Helper functions for reading and processing files
 */

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

class FileUtils {
	/**
	 * Read package.json from workspace
	 * @returns {string} Package.json content or empty string
	 */
	readPackageJson() {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length > 0) {
			const workspacePath = workspaceFolders[0].uri.fsPath;
			const packageJsonPath = path.join(workspacePath, 'package.json');
			if (fs.existsSync(packageJsonPath)) {
				return fs.readFileSync(packageJsonPath, 'utf8');
			}
		}
		return '';
	}

	/**
	 * Generate fallback description from tree and package.json
	 * @param {string} treeText - Directory tree text
	 * @param {string} packageJsonContent - Package.json content
	 * @returns {string} Fallback description
	 */
	generateFallbackDescription(treeText, packageJsonContent) {
		let description = 'This is a codebase project.';
		
		if (packageJsonContent) {
			try {
				const pkg = JSON.parse(packageJsonContent);
				if (pkg.name) {
					description = `This is a ${pkg.name} project.`;
				}
				if (pkg.description) {
					description += ` ${pkg.description}`;
				}
			} catch (e) {
				// Ignore parse errors
			}
		}
		
		// Detect framework from tree structure
		if (treeText.includes('node_modules')) {
			description += ' It uses Node.js and npm dependencies.';
		}
		if (treeText.includes('src/') || treeText.includes('components/')) {
			description += ' The project has a structured source code organization.';
		}
		
		return description;
	}

	/**
	 * Extract features from package.json
	 * @param {string} packageJsonContent - Package.json content
	 * @returns {string[]} Array of detected features
	 */
	extractFeaturesFromPackageJson(packageJsonContent) {
		const features = [];
		if (!packageJsonContent) return features;
		
		try {
			const pkg = JSON.parse(packageJsonContent);
			const deps = { ...pkg.dependencies, ...pkg.devDependencies };
			
			// Detect common features
			if (deps['react'] || deps['@react']) features.push('React');
			if (deps['vue']) features.push('Vue.js');
			if (deps['express']) features.push('Express.js');
			if (deps['next']) features.push('Next.js');
			if (deps['typescript']) features.push('TypeScript');
			if (deps['tailwindcss']) features.push('Tailwind CSS');
			if (deps['@supabase/supabase-js']) features.push('Supabase');
			if (deps['mongodb'] || deps['mongoose']) features.push('MongoDB');
			if (deps['pg'] || deps['postgresql']) features.push('PostgreSQL');
		} catch (e) {
			// Ignore parse errors
		}
		
		return features;
	}

	/**
	 * Extract features from text content
	 * @param {string} text - Text content to analyze
	 * @returns {string[]} Array of detected features
	 */
	extractFeaturesFromText(text) {
		const features = [];
		const lowerText = text.toLowerCase();
		
		// Simple keyword detection
		if (lowerText.includes('react')) features.push('React');
		if (lowerText.includes('vue')) features.push('Vue.js');
		if (lowerText.includes('express')) features.push('Express.js');
		if (lowerText.includes('next')) features.push('Next.js');
		if (lowerText.includes('typescript')) features.push('TypeScript');
		
		return features;
	}
}

module.exports = new FileUtils();

