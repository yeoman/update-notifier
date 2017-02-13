'use strict';
const updateNotifier = require('.');

// Run: $ node example

// You have to run this file two times the first time
// This is because it never reports updates on the first run
// If you want to test your own usage, ensure you set an older version

updateNotifier({
	pkg: {
		name: 'public-ip',
		version: '0.9.2'
	},
	updateCheckInterval: 0
}).notify();
