'use strict';
var updateNotifier = require('../');

// you have to run this file two times the first time

updateNotifier({
	pkg: {
		name: 'public-ip',
		version: '0.9.2'
	},
	updateCheckInterval: 0
}).notify();
