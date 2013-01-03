'use strict';
var util = require('util');
var path = require('path');
var Configstore = require('configstore');
var request = require('request');
var colors = require('colors');


function UpdateNotifier(options) {
	options = options || {};

	if (!options.packageName || !options.packageVersion) {
		this.packageFile = require(path.resolve(path.dirname(module.parent.filename), options.packagePath || 'package'));
	}

	this.packageName = options.packageName || this.packageFile.name;
	this.packageVersion = options.packageVersion || this.packageFile.version;
	this.updateCheckInterval = options.updateCheckInterval || 1000 * 60 * 60 * 24; // 1 day
	this.registryUrl = options.registryUrl || 'http://registry.npmjs.org/%s';
	this.config = new Configstore('update-notifier-' + this.packageName, {
		optOut: false
	});
}

UpdateNotifier.prototype.check = function() {
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

	this.checkNpm(function(update) {
		if (update.type && update.type !== 'latest') {
			this.config.set('update', update);
		}
	}.bind(this));
};

UpdateNotifier.prototype.checkNpm = function(cb) {
	var url = util.format(this.registryUrl, this.packageName);

	request({url: url, json: true}, function(error, response, body) {
		var currentVersion, latestVersion;

		if (body.error) {
			error = 'Package not found';
		}

		currentVersion = this.packageVersion;
		latestVersion = Object.keys(body.time).reverse()[0];

		cb({
			latest: latestVersion,
			current: currentVersion,
			type: this.updateType(currentVersion, latestVersion),
			date: body.time[latestVersion],
			name: this.packageName,
			error: error
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

module.exports = function(options) {
	var updateNotifier = new UpdateNotifier(options);
	updateNotifier.check();
	return updateNotifier;
};
