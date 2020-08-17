#!/usr/bin/env node
const updateNotifier = require('../index.js');

test();

async function test() {
	const testRemoteUri = 'https://github.com/yeoman/update-notifier.git';


	const notifier = updateNotifier({
		pkg: {
			name: 'update-notifier',
			version: '0.9.0'
		},
		updateCheckInterval: 1000,
		remoteUrl: testRemoteUri,
	});
	// Notify using the built-in convenience method
	notifier.notify();
	// console.log('test:notifier.update', notifier.update);

}
