// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const ConversationProvider = require('./conversationProvider');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "KTH" is now active!');
	console.log('Extension context:', context);

	// Register the conversational sidebar view IMMEDIATELY
	try {
		const conversationProvider = new ConversationProvider(context);
		const providerDisposable = vscode.window.registerWebviewViewProvider(
			'kth-conversational-view', 
			conversationProvider
		);
		context.subscriptions.push(providerDisposable);
		console.log('✓ Conversation provider registered successfully for view: kth-conversational-view');
	} catch (error) {
		console.error('✗ Error registering conversation provider:', error);
		vscode.window.showErrorMessage('Failed to register conversation view: ' + error.message);
	}

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('KTH.helloWorld', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from teachMe!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
