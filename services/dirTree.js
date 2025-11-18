const path = require('path');
const fs = require('fs');

function readGitignore(workspacePath) {
	const gitignorePath = path.join(workspacePath, '.gitignore');
	const patterns = [];
	try {
		if (fs.existsSync(gitignorePath)) {
			const content = fs.readFileSync(gitignorePath, 'utf8');
			const lines = content.split('\n');
			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed === '' || trimmed.startsWith('#')) continue;
				patterns.push(trimmed);
			}
		}
	} catch (error) {
		console.log('Could not read .gitignore:', error.message);
	}
	return patterns;
}

function matchesPattern(filePath, pathSegments, pattern) {
	if (pattern.startsWith('!')) return false;
	const isDirectoryPattern = pattern.endsWith('/');
	const cleanPattern = isDirectoryPattern ? pattern.slice(0, -1) : pattern;
	const isRootAnchored = cleanPattern.startsWith('/');
	const normalizedPattern = isRootAnchored ? cleanPattern.slice(1) : cleanPattern;
	let regexPattern = normalizedPattern
		.replace(/\./g, '\\.')
		.replace(/\*\*/g, '___DOUBLE_STAR___')
		.replace(/\*/g, '[^/]*')
		.replace(/___DOUBLE_STAR___/g, '.*')
		.replace(/\?/g, '[^/]');
	if (normalizedPattern.includes('**')) {
		const regex = new RegExp(regexPattern);
		return regex.test(filePath);
	}
	for (const segment of pathSegments) {
		const regex = new RegExp(`^${regexPattern}$`);
		if (regex.test(segment)) return true;
	}
	if (isRootAnchored) {
		const regex = new RegExp(`^${regexPattern}`);
		return regex.test(filePath);
	} else {
		const regex = new RegExp(regexPattern);
		for (const segment of pathSegments) {
			if (regex.test(segment)) return true;
		}
		if (regex.test(filePath)) return true;
	}
	return false;
}

function shouldIgnore(filePath, relativePath, gitignorePatterns) {
	if (!gitignorePatterns || gitignorePatterns.length === 0) return false;
	const normalizedPath = relativePath.replace(/\\/g, '/');
	const pathSegments = normalizedPath.split('/');
	for (const pattern of gitignorePatterns) {
		if (matchesPattern(normalizedPath, pathSegments, pattern)) return true;
	}
	return false;
}

async function readDirectoryTree(dirPath, relativePath, tree, depth, gitignorePatterns = []) {
	if (depth > 5) return tree;
	const skipDirs = ['node_modules', '.git', '.vscode', 'dist', 'build', '.next', 'out'];
	const dirName = path.basename(dirPath);
	if (skipDirs.includes(dirName) && depth > 0) return tree;
	try {
		const entries = fs.readdirSync(dirPath, { withFileTypes: true });
		entries.sort((a, b) => {
			if (a.isDirectory() === b.isDirectory()) return a.name.localeCompare(b.name);
			return a.isDirectory() ? -1 : 1;
		});
		for (const entry of entries) {
			const fullPath = path.join(dirPath, entry.name);
			const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
			
			// Always ignore the cache file to prevent it from affecting the hash
			if (entry.name === '.kth-analysis-cache.json') continue;
			
			if (shouldIgnore(fullPath, relPath, gitignorePatterns)) continue;
			if (entry.isDirectory()) {
				tree.push({ name: entry.name, path: relPath, type: 'directory', depth });
				await readDirectoryTree(fullPath, relPath, tree, depth + 1, gitignorePatterns);
			} else {
				tree.push({ name: entry.name, path: relPath, type: 'file', depth });
			}
		}
	} catch (error) {
		console.log(`Skipping ${dirPath}: ${error.message}`);
	}
	return tree;
}

function formatTree(treeItems, rootPath) {
	if (treeItems.length === 0) return 'The workspace directory is empty.';
	const rootName = path.basename(rootPath);
	let formatted = `📁 **${rootName}**\n\`\`\`\n`;
	for (let i = 0; i < treeItems.length; i++) {
		const item = treeItems[i];
		const depth = item.depth;
		let isLastSibling = true;
		for (let j = i + 1; j < treeItems.length; j++) {
			const nextItem = treeItems[j];
			if (nextItem.depth < depth) break;
			if (nextItem.depth === depth) { isLastSibling = false; break; }
		}
		let prefix = '';
		for (let d = 1; d < depth; d++) {
			let hasMoreAtLevel = false;
			for (let j = i + 1; j < treeItems.length; j++) {
				const nextItem = treeItems[j];
				if (nextItem.depth < d) break;
				if (nextItem.depth === d) { hasMoreAtLevel = true; break; }
			}
			prefix += hasMoreAtLevel ? '│   ' : '    ';
		}
		prefix += isLastSibling ? '└── ' : '├── ';
		const icon = item.type === 'directory' ? '📁' : '📄';
		formatted += `${prefix}${icon} ${item.name}\n`;
	}
	formatted += `\`\`\``;
	return formatted;
}

module.exports = {
	readGitignore,
	shouldIgnore,
	matchesPattern,
	readDirectoryTree,
	formatTree,
};


