const vscode = require('vscode');

class OpenAIClient {
	constructor(openaiInstance) {
		this.openai = openaiInstance;
	}

	async chatWithTools(messages, tools) {
		return await this.openai.chat.completions.create({
			model: 'gpt-4o',
			messages,
			tools,
			tool_choice: 'auto',
			temperature: 0.7,
			max_tokens: 2000,
		});
	}
}

module.exports = { OpenAIClient };


