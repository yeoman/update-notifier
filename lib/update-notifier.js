'use strict';
var util = require('util');
var path = require('path');
var Configstore = require('configstore');
var request = require('request');
var colors = require('colors');
var fork = require('child_process').fork;


function UpdateNotifier(options) {
	this.options = options = options || {};

	if (!options.packageName && !options.packageVersion) {
		this.packageFile = require(path.resolve(path.dirname(module.parent.filename), options.packagePath || 'package'));
	}

	this.packageName = options.packageName || this.packageFile.name;
	this.packageVersion = options.packageVersion || this.packageFile.version;
	this.updateCheckInterval = options.updateCheckInterval || 1000 * 60 * 60 * 24; // 1 day
	this.updateCheckTimeout = options.updateCheckTimeout || 20000;                 // 10 secs
	this.registryUrl = options.registryUrl || 'http://registry.npmjs.org/%s';
	this.config = new Configstore('update-notifier-' + this.packageName, {
		optOut: false
	});
}

UpdateNotifier.prototype.check = function() {
	var cp;

	if (this.config.get('optOut')) {
		return;
	}

	// Only check for updates on a set interval
	if (new Date() - this.config.get('lastUpdateCheck') < this.updateCheckInterval) {
		return;
	}

	this.config.set('lastUpdateCheck', +new Date());
	this.update = this.config.get('update');
	this.config.del('update');

	// Set some needed options before forking
	// This is needed because we can't infer the packagePath in the fork
	this.options.packageName = this.packageName;
	this.options.packageVersion = this.packageVersion;

	// Fork, passing the options as an environment property
	cp = fork(__filename, [], {
		detached: true,
		stdio: ['ignore', 'ignore', 'ignore'],
		env: {
			_UPDATE_NOTIFIER_OPTIONS: JSON.stringify(this.options, null, '  ')
		}
	});
	cp.unref();
	cp.disconnect();
};

UpdateNotifier.prototype.checkNpm = function(cb) {
	var url = util.format(this.registryUrl, this.packageName);

	request({url: url, json: true, timeout: this.updateCheckTimeout}, function(error, response, body) {
		var currentVersion, latestVersion;

		if (error) {
			return cb(error);
		}

		if (body.error) {
			return cb(new Error('Package not found'));
		}

		currentVersion = this.packageVersion;
		latestVersion = Object.keys(body.time).reverse()[0];

		cb(null, {
			latest: latestVersion,
			current: currentVersion,
			type: this.updateType(currentVersion, latestVersion),
			date: body.time[latestVersion],
			name: this.packageName
		});
	}.bind(this));
};

UpdateNotifier.prototype.notify = function(customMessage) {
	var message =
		'-----------------------------------------'.blue.bold +
		'\nUpdate available: ' + this.update.latest.green.bold +
		(' (current: ' + this.update.current + ')').grey +
		'\nRun ' + ('npm update -g ' + this.packageName).magenta +
		' to update\n' +
		'-----------------------------------------'.blue;
	if (customMessage) {
		process.on('exit', function() {
			console.log(typeof customMessage === 'string' ? customMessage : message);
		});
	} else {
		console.log(message);
	}
};

UpdateNotifier.prototype.updateType = function(currentVersion, latestVersion) {
	if (currentVersion  === latestVersion) {
		return 'latest';
	}

	currentVersion = currentVersion.split('.');
	latestVersion = latestVersion.split('.');

	if (latestVersion[0] > currentVersion[0]) {
		return 'major';
	} else if (latestVersion[1] > currentVersion[1]) {
		return 'minor';
	} else if (latestVersion[2] > currentVersion[2]) {
		return 'patch';
	}
};

// Check if the current process is the child one
if (process.env._UPDATE_NOTIFIER_OPTIONS) {
	var options = JSON.parse(process.env._UPDATE_NOTIFIER_OPTIONS),
		updateNotifier;

	updateNotifier = new UpdateNotifier(options);
	updateNotifier.checkNpm(function(err, update) {
		if (err) {
			process.exit(1);
		}

		if (update.type && update.type !== 'latest') {
			updateNotifier.config.set('update', update);
		}

		// Call process exit explicitly to terminate the child process
		// Otherwise the child process will run forever (according to nodejs docs)
		process.exit();
	});
} else {
	module.exports = function(options) {
		var updateNotifier = new UpdateNotifier(options);
		updateNotifier.check();

		return updateNotifier;
	};
}