/* eslint-disable unicorn/no-process-exit */
'use strict';
var updateChecker = require('./');

var options = JSON.parse(process.argv[2]);

updateChecker = new updateChecker.UpdateChecker(options);

updateChecker.checkLatest().then(function (update) {
	// only update the last update check time on success
	updateChecker.config.set('lastUpdateCheck', Date.now());

	if (update.type && update.type !== 'latest') {
		updateChecker.config.set('update', update);
	}

	// Call process exit explicitly to terminate the child process
	// Otherwise the child process will run forever (according to nodejs docs)
	process.exit();
}).catch(function () {
	process.exit(1);
});
