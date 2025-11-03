const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const dirTree = require('../services/dirTree');

suite('DirTree Test Suite', () => {
	let testDir;

	setup(() => {
		// Create a temporary test directory
		testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dirTree-test-'));
		
		// Create test structure
		fs.mkdirSync(path.join(testDir, 'src'));
		fs.mkdirSync(path.join(testDir, 'src', 'components'));
		fs.writeFileSync(path.join(testDir, 'README.md'), '# Test Project');
		fs.writeFileSync(path.join(testDir, 'src', 'index.js'), 'console.log("test");');
		fs.writeFileSync(path.join(testDir, 'src', 'components', 'App.js'), 'export const App = () => {};');
	});

	teardown(() => {
		// Clean up test directory
		if (testDir && fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
	});

	test('readDirectoryTree should return tree structure', async () => {
		const tree = await dirTree.readDirectoryTree(testDir, '', [], 0, []);
		
		assert.ok(Array.isArray(tree), 'Tree should be an array');
		assert.ok(tree.length > 0, 'Tree should have items');
		
		// Check if README.md is in the tree
		const readmeItem = tree.find(item => item.name === 'README.md');
		assert.ok(readmeItem, 'README.md should be in tree');
		assert.strictEqual(readmeItem.type, 'file', 'README.md should be a file');
	});

	test('readDirectoryTree should call progress callback', async () => {
		let progressCallCount = 0;
		let lastProgress = null;

		const progressCallback = (progress) => {
			progressCallCount++;
			lastProgress = progress;
		};

		await dirTree.readDirectoryTree(testDir, '', [], 0, [], progressCallback);
		
		assert.ok(progressCallCount > 0, 'Progress callback should be called at least once');
		assert.ok(lastProgress, 'Last progress should be recorded');
		assert.ok(lastProgress.total > 0, 'Progress should report total items');
	});

	test('formatTree should return formatted string', () => {
		const tree = [
			{ name: 'README.md', path: 'README.md', type: 'file', depth: 0 },
			{ name: 'src', path: 'src', type: 'directory', depth: 0 },
			{ name: 'index.js', path: 'src/index.js', type: 'file', depth: 1 }
		];

		const formatted = dirTree.formatTree(tree, testDir);
		
		assert.ok(typeof formatted === 'string', 'Formatted output should be a string');
		assert.ok(formatted.includes('README.md'), 'Output should include README.md');
		assert.ok(formatted.includes('src'), 'Output should include src directory');
		assert.ok(formatted.includes('index.js'), 'Output should include index.js');
	});

	test('readGitignore should parse gitignore patterns', () => {
		const gitignorePath = path.join(testDir, '.gitignore');
		fs.writeFileSync(gitignorePath, 'node_modules\n*.log\n# comment\n\ndist/');

		const patterns = dirTree.readGitignore(testDir);
		
		assert.ok(Array.isArray(patterns), 'Patterns should be an array');
		assert.ok(patterns.includes('node_modules'), 'Should include node_modules');
		assert.ok(patterns.includes('*.log'), 'Should include *.log');
		assert.ok(patterns.includes('dist/'), 'Should include dist/');
		assert.ok(!patterns.includes('# comment'), 'Should not include comments');
		assert.ok(!patterns.includes(''), 'Should not include empty lines');
	});
});
