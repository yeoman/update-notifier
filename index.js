'use strict';
var util = require('util');
var path = require('path');
var fork = require('child_process').fork;
var Configstore = require('configstore');
var chalk = require('chalk');
var semverTypeDiff = require('semver-type-diff');
var latestVersion = require('latest-version');

function UpdateNotifier(options) {
	this.options = options = options || {};

	if (!options.packageName || !options.packageVersion) {
		this.packageFile = require(path.resolve(path.dirname(module.parent.filename), options.packagePath || 'package'));
	}

	if (options.callback) {
		this.hasCallback = true;
	}

	this.packageName = options.packageName || this.packageFile.name;
	this.packageVersion = options.packageVersion || this.packageFile.version;
	this.updateCheckInterval = typeof options.updateCheckInterval === 'number' ? options.updateCheckInterval : 1000 * 60 * 60 * 24; // 1 day
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

	// Set some needed options before forking
	// This is needed because we can't infer the packagePath in the fork
	this.options.packageName = this.packageName;
	this.options.packageVersion = this.packageVersion;

	// Fork, passing the options as an environment property
	cp = fork(__dirname + '/check.js', [JSON.stringify(this.options)]);
	cp.unref();
	cp.disconnect();
};

UpdateNotifier.prototype.checkNpm = function (cb) {
	var url = util.format(this.registryUrl, this.packageName);

	latestVersion(this.packageName, function (err, latestVersion) {
		if (err) {
			return cb(err);
		}

		cb(null, {
			latest: latestVersion,
			current: this.packageVersion,
			type: semverTypeDiff(this.packageVersion, latestVersion) || 'latest',
			name: this.packageName
		});
	}.bind(this));
};

UpdateNotifier.prototype.notify = function (customMessage) {
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
};

module.exports = function (options) {
	var updateNotifier = new UpdateNotifier(options);

	updateNotifier.check();

	return updateNotifier;
};

module.exports.UpdateNotifier = UpdateNotifier;
