'use strict';
var spawn = require('child_process').spawn;
var path = require('path');
var Configstore = require('configstore');
var chalk = require('chalk');
var semverDiff = require('semver-diff');
var latestVersion = require('latest-version');

function UpdateNotifier(options) {
	this.options = options = options || {};

	if (!options.packageName || !options.packageVersion) {
		throw new Error('packageName and packageVersion required');
	}

	this.packageName = options.packageName;
	this.packageVersion = options.packageVersion;
	this.updateCheckInterval = typeof options.updateCheckInterval === 'number' ? options.updateCheckInterval : 1000 * 60 * 60 * 24; // 1 day
	this.hasCallback = typeof options.callback === 'function';
	this.callback = options.callback || function () {};

	if (!this.hasCallback) {
		this.config = new Configstore('update-notifier-' + this.packageName, {
			optOut: false
		});
	}
}

UpdateNotifier.prototype.check = function () {
	if (this.hasCallback) {
		return this.checkNpm(this.callback);
	}

	var cp;

	if (this.config.get('optOut')) {
		return;
	}

	this.update = this.config.get('update');
	if (this.update) {
		this.config.del('update');
	}

	// Only check for updates on a set interval
	if (new Date() - this.config.get('lastUpdateCheck') < this.updateCheckInterval) {
		return;
	}

	this.config.set('lastUpdateCheck', +new Date());
	this.config.del('update');

	// Spawn a detached process, passing the options as an environment property
	cp = spawn(process.execPath, [path.join(__dirname, 'check.js'), JSON.stringify(this.options)], {
		detached: true,
		stdio: 'ignore'
	});
	cp.unref();
};

UpdateNotifier.prototype.checkNpm = function (cb) {
	latestVersion(this.packageName, function (err, latestVersion) {
		if (err) {
			return cb(err);
		}

		cb(null, {
			latest: latestVersion,
			current: this.packageVersion,
			type: semverDiff(this.packageVersion, latestVersion) || 'latest',
			name: this.packageName
		});
	}.bind(this));
};

UpdateNotifier.prototype.notify = function (customMessage) {
	if (!process.stdout.isTTY || !this.update) {
		return this;
	}

	var message =
		'\n\n' +
		chalk.blue('-----------------------------------------') +
		'\nUpdate available: ' + chalk.green.bold(this.update.latest) +
		chalk.gray(' (current: ' + this.update.current + ')') +
		'\nRun ' + chalk.magenta('npm update -g ' + this.packageName) +
		' to update\n' +
		chalk.blue('-----------------------------------------');

	if (customMessage) {
		process.on('exit', function () {
			console.log(typeof customMessage === 'string' ? customMessage : message);
		});
	} else {
		console.log(message);
	}

	return this;
};

module.exports = function (options) {
	var updateNotifier = new UpdateNotifier(options);
	updateNotifier.check();
	return updateNotifier;
};

module.exports.UpdateNotifier = UpdateNotifier;
