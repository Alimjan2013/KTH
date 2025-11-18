/**
 * Analysis Cache Service
 * Handles saving and loading analysis results to avoid re-running expensive LLM calls
 */

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class AnalysisCache {
	/**
	 * Get the cache file path in workspace root
	 */
	getCacheFilePath() {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return null;
		}
		const workspacePath = workspaceFolders[0].uri.fsPath;
		return path.join(workspacePath, '.kth-analysis-cache.json');
	}

	/**
	 * Generate a hash of the directory tree to detect changes
	 */
	async generateCodebaseHash(treeText) {
		// Normalize the tree text to ensure consistent hashing
		// Remove extra whitespace and normalize line endings
		const normalized = treeText.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
		// Create a hash from the directory tree
		// This helps detect if the codebase structure has changed
		return crypto.createHash('md5').update(normalized).digest('hex');
	}

	/**
	 * Load cached minimax analysis if available and valid
	 * @param {string} currentCodebaseHash - Current hash of the codebase
	 * @returns {object|null} Cached minimax analysis result or null if not available/invalid
	 */
	loadCache(currentCodebaseHash) {
		try {
			const cachePath = this.getCacheFilePath();
			if (!cachePath || !fs.existsSync(cachePath)) {
				console.log('No cache file found at:', cachePath);
				return null;
			}

			console.log('=== CACHE LOADING ===');
			console.log('Cache file path:', cachePath);
			console.log('Cache file exists:', fs.existsSync(cachePath));
			console.log('Current codebase hash:', currentCodebaseHash);
			
			// Get workspace path for debugging
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (workspaceFolders && workspaceFolders.length > 0) {
				console.log('Workspace path:', workspaceFolders[0].uri.fsPath);
			}

			const cacheContent = fs.readFileSync(cachePath, 'utf8');
			const cache = JSON.parse(cacheContent);

			console.log('Cache file contents:', {
				hasCodebaseHash: !!cache.codebaseHash,
				cachedHash: cache.codebaseHash,
				hasDetailedAnalysis: !!cache.detailedAnalysis,
				detailedAnalysisLength: cache.detailedAnalysis ? cache.detailedAnalysis.length : 0,
				hasFeatures: !!cache.features,
				featuresCount: cache.features ? cache.features.length : 0,
				hasFileContents: !!cache.fileContents,
				fileContentsCount: cache.fileContents ? Object.keys(cache.fileContents).length : 0
			});

			// Check if cache has required fields (detailedAnalysis from minimax)
			if (!cache.detailedAnalysis) {
				console.log('Cache invalid: missing required field (detailedAnalysis)');
				return null;
			}

			// Check if cache is valid (codebase hasn't changed)
			if (cache.codebaseHash !== currentCodebaseHash) {
				console.log('Cache invalid: codebase has changed');
				console.log('  Cached hash:', cache.codebaseHash);
				console.log('  Current hash:', currentCodebaseHash);
				return null;
			}

			console.log('Cache loaded successfully - minimax analysis found');
			console.log('Cache details:', {
				detailedAnalysisPreview: cache.detailedAnalysis.substring(0, 200),
				features: cache.features,
				timestamp: cache.timestamp
			});
			console.log('===================');

			return {
				detailedAnalysis: cache.detailedAnalysis,
				features: cache.features || [],
				fileContents: cache.fileContents || {},
				timestamp: cache.timestamp
			};
		} catch (error) {
			console.error('Error loading cache:', error);
			console.error('Error stack:', error.stack);
			return null;
		}
	}

	/**
	 * Save minimax analysis result to cache (Stage 1 result)
	 * @param {string} codebaseHash - Hash of the current codebase
	 * @param {string} detailedAnalysis - Detailed analysis from minimax (Stage 1)
	 * @param {string[]} features - Detected features from minimax
	 * @param {object} fileContents - File contents read during analysis (optional)
	 */
	saveCache(codebaseHash, detailedAnalysis, features, fileContents = {}) {
		try {
			const cachePath = this.getCacheFilePath();
			if (!cachePath) {
				console.warn('Cannot save cache: no workspace folder');
				return;
			}

			const cacheData = {
				codebaseHash: codebaseHash,
				detailedAnalysis: detailedAnalysis,
				features: features || [],
				fileContents: fileContents,
				timestamp: new Date().toISOString()
			};

			fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), 'utf8');
			console.log('=== CACHE SAVED ===');
			console.log('Cache file path:', cachePath);
			console.log('Codebase hash saved:', codebaseHash);
			console.log('Cache includes:', {
				detailedAnalysisLength: detailedAnalysis.length,
				featuresCount: features.length,
				filesRead: Object.keys(fileContents).length
			});
			console.log('===================');
		} catch (error) {
			console.error('Error saving cache:', error);
		}
	}

	/**
	 * Clear the cache file
	 */
	clearCache() {
		try {
			const cachePath = this.getCacheFilePath();
			if (cachePath && fs.existsSync(cachePath)) {
				fs.unlinkSync(cachePath);
				console.log('Cache cleared');
			}
		} catch (error) {
			console.error('Error clearing cache:', error);
		}
	}
}

module.exports = new AnalysisCache();

