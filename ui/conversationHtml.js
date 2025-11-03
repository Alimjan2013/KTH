function getReactHtml({ scriptUri, styleUri, cspSource, nonce }) {
	return `<!DOCTYPE html>
<html lang="en">
	<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: data:; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'nonce-${nonce}'; font-src ${cspSource}; connect-src ${cspSource} https:;">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Conversation</title>
	<link rel="stylesheet" href="${styleUri}">
	</head>
	<body>
		<div id="root"></div>
		<script nonce="${nonce}" src="${scriptUri}"></script>
	</body>
</html>`;
}

module.exports = { getReactHtml };


