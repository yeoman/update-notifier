'use strict';
var spawn = require('child_process').spawn;
var path = require('path');
var Configstore = require('configstore');
var chalk = require('chalk');
var semverDiff = require('semver-diff');
var latestVersion = require('latest-version');
var latestCommit = require('./latestGit');
var stringLength = require('string-length');
var isNpm = require('is-npm');

function UpdateNotifier(options) {
	this.options = options = options || {};

	if (options.packageName && options.packageVersion) {
		options.checkWhat = "checkNpm";
	} else if (options.packageName && options.remote) {
		options.checkWhat = "checkGit";
	} else {
		throw new Error('Either packageName and packageVersion or remote required');
	}

	this.packageName = options.packageName;
	this.packageVersion = options.packageVersion;
	this.remote = options.remote;
	this.updateCheckInterval = typeof options.updateCheckInterval === 'number' ? options.updateCheckInterval : 1000 * 60 * 60 * 24; // 1 day
	this.hasCallback = typeof options.callback === 'function';
	this.callback = options.callback || function () {};

	if (!this.hasCallback) {
		this.config = new Configstore('update-notifier-' + this.packageName, {
			optOut: false,
			// init with the current time so the first check is only
			// after the set interval, so not to bother users right away
			lastUpdateCheck: Date.now()
		});
	}
}

UpdateNotifier.prototype.check = function () {
	if (this.hasCallback) {
		return this.checkNpm(this.callback);
	}

	if (this.config.get('optOut') || 'NO_UPDATE_NOTIFIER' in process.env) {
		return;
	}

	this.update = this.config.get('update');

	if (this.update) {
		this.config.del('update');
	}

	// Only check for updates on a set interval
	if (Date.now() - this.config.get('lastUpdateCheck') < this.updateCheckInterval) {
		return;
	}

	// Spawn a detached process, passing the options as an environment property
	spawn(process.execPath, [path.join(__dirname, 'check.js'), JSON.stringify(this.options)], {
		detached: true,
		stdio: 'ignore'
	}).unref();
};

UpdateNotifier.prototype.checkNpm = function (cb) {
	latestVersion(this.packageName, function (err, latestVersion) {
		if (err) {
			return cb(err);
		}

		cb(null, {
			message: "npm",
			latest: latestVersion,
			current: this.packageVersion,
			type: semverDiff(this.packageVersion, latestVersion) || 'latest',
			name: this.packageName
		});
	}.bind(this));
};

UpdateNotifier.prototype.checkGit = function (cb) {
	latestCommit(this.remote, function (err, info) {
		if (err) {
			return cb(err);
		}

		var commits = info.commits;
		var count = commits.length;
		var latest = count ? commits[0].date : "";

		cb(null, {
			message: "git",
			latest: latest,
			type: count > 0 ? 'behind' : 'latest',
			name: this.packageName,
		});
	}.bind(this));
};

UpdateNotifier.prototype.notify = function (opts) {
	if (!process.stdout.isTTY || isNpm || !this.update) {
		return this;
	}

	opts = opts || {};
	opts.defer = opts.defer === undefined ? true : false;
	var what = this.update.message || "npm";

	var fill = function (str, count) {
		return Array(count + 1).join(str);
	};

	var lines = messages[what].call(this);
	var contentWidth = Math.max.apply(Math, lines.map(function (line) {
		return stringLength(line);
	}));
	var top = chalk.yellow('┌' + fill('─', contentWidth) + '┐');
	var bottom = chalk.yellow('└' + fill('─', contentWidth) + '┘');
	var side = chalk.yellow('│');

	var message =
		'\n\n' +
		top + '\n';
	for (var i = 0, len = lines.length; i < len; i += 1) {
		var rest = contentWidth - stringLength(lines[i]);
		message += side + lines[i] + fill(' ', rest) + side + '\n';
	}
	message += bottom + '\n';

	if (opts.defer) {
		process.on('exit', function () {
			console.error(message);
		});
	} else {
		console.error(message);
	}

	return this;
};

var messages = {
	npm: function () {
		return [
			' Update available: ' + chalk.green.bold(this.update.latest) +
				chalk.dim(' (current: ' + this.update.current + ')') + ' ',
			' Run ' + chalk.blue('npm update -g ' + this.packageName) +
				' to update. '
		];
	},
	git: function () {
		return [
			' Update available pushed ' + chalk.green.bold(this.update.latest),
			' Run ' + chalk.blue('git pull ' + this.remote) +
				' to update. '
		];
	}
};

module.exports = function (options) {
	var updateNotifier = new UpdateNotifier(options);
	updateNotifier.check();
	return updateNotifier;
};

module.exports.UpdateNotifier = UpdateNotifier;
