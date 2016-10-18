'use strict';
var spawn = require('child_process').spawn;
var path = require('path');
var format = require('util').format;
var lazyRequire = require('lazy-req')(require);

var configstore = lazyRequire('configstore');
var chalk = lazyRequire('chalk');
var semverDiff = lazyRequire('semver-diff');
var latestVersion = lazyRequire('latest-version');
var isNpm = lazyRequire('is-npm');
var boxen = lazyRequire('boxen');
var xdgBasedir = lazyRequire('xdg-basedir');
var ONE_DAY = 1000 * 60 * 60 * 24;

function Notifier(options) {
	options = options || {};

	this.boxenOpts = options.boxenOpts || {
		padding: 1,
		margin: 1,
		align: 'center',
		borderColor: 'yellow',
		borderStyle: 'round'
	};
}

Notifier.prototype.notify = function (opts) {
	if (!process.stdout.isTTY || isNpm() || !opts.update) {
		return this;
	}

	opts = opts || {};

	opts.message = opts.message || 'Update available';

	var message = '\n' + boxen()(opts.message, this.boxenOpts);

	if (opts.defer === false) {
		console.error(message);
	} else {
		process.on('exit', function () {
			console.error(message);
		});

		process.on('SIGINT', function () {
			console.error('\n' + message);
		});
	}

	return this;
};

function UpdateChecker(options) {
	this.options = options = options || {};

	this.updateCheckInterval = typeof options.updateCheckInterval === 'number' ? options.updateCheckInterval : ONE_DAY;
	this.hasCallback = typeof options.callback === 'function';
	this.callback = options.callback || function () {};
	this.getLatest = options.getLatest || function () {
		return Promise.resolve('');
	};

	if (!options.currentVersion) {
		throw new Error('currentVersion required');
	}
	this.currentVersion = options.currentVersion;

	if (!options.updaterName) {
		throw new Error('updaterName required');
	}
	this.updaterName = options.updaterName;

	if (!this.hasCallback) {
		try {
			var ConfigStore = configstore();
			this.config = new ConfigStore('update-notifier-' + this.updaterName, {
				optOut: false,
				// init with the current time so the first check is only
				// after the set interval, so not to bother users right away
				lastUpdateCheck: Date.now()
			});
		} catch (err) {
			// expecting error code EACCES or EPERM
			var msg =
				chalk().yellow(format(' %s update check failed ', this.updaterName)) +
				format('\n Try running with %s or get access ', chalk().cyan('sudo')) +
				'\n to the local update config store via \n' +
				chalk().cyan(format(' sudo chown -R $USER:$(id -gn $USER) %s ', xdgBasedir().config));

			process.on('exit', function () {
				console.error('\n' + boxen()(msg, {align: 'center'}));
			});
		}
	}
}

UpdateChecker.prototype.checkLatest = function () {
	return this.getLatest().then(function (latestVersion) {
		return {
			latest: latestVersion,
			current: this.currentVersion,
			type: semverDiff()(this.currentVersion, latestVersion) || 'latest'
		};
	}.bind(this));
};

UpdateChecker.prototype.check = function () {
	if (this.hasCallback) {
		this.checkLatest().then(this.callback.bind(this, null)).catch(this.callback);
		return;
	}
	if (
		!this.config ||
		this.config.get('optOut') ||
		'NO_UPDATE_NOTIFIER' in process.env ||
		process.argv.indexOf('--no-update-notifier') !== -1
	) {
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

function PackageUpdateNotifier(options) {
	this.options = options = options || {};
	options.pkg = options.pkg || {};

	// reduce pkg to the essential keys. with fallback to deprecated options
	// TODO: remove deprecated options at some point far into the future
	options.pkg = {
		name: options.pkg.name || options.packageName,
		version: options.pkg.version || options.packageVersion
	};

	if (!options.pkg.name || !options.pkg.version) {
		throw new Error('pkg.name and pkg.version required');
	}

	this.packageName = options.pkg.name;
	this.packageVersion = options.pkg.version;
	this.updateCheckInterval = typeof options.updateCheckInterval === 'number' && options.updateCheckInterval;
	this.hasCallback = typeof options.callback === 'function';
	this.callback = options.callback || function () {};

	this.updateChecker = new UpdateChecker({
		callback: options.callback,
		currentVersion: this.packageVersion,
		getLatest: function () {
			return latestVersion()(this.packageName);
		}.bind(this),
		updaterName: this.packageName,
		updateCheckInterval: options.updateCheckInterval
	});

	// TODO: deprecate
	this.config = this.updateChecker.config;
}

// TODO: deprecate
PackageUpdateNotifier.prototype.checkNpm = function () {
	return this.updateChecker.checkLatest();
};

PackageUpdateNotifier.prototype.check = function () {
	return this.updateChecker.check();
};

PackageUpdateNotifier.prototype.notify = function (opts) {
	var notifier = new Notifier();

	opts = opts || {};

	opts.update = (this.updateChecker && this.updateChecker.update) || {};

	opts.message = opts.message || 'Update available ' + chalk().dim(opts.update.current) + chalk().reset(' → ') +
		chalk().green(opts.update.latest) + ' \nRun ' + chalk().cyan('npm i -g ' + this.packageName) + ' to update';

	return notifier.notify(opts);
};

module.exports = function (options) {
	var updateNotifier = new PackageUpdateNotifier(options);
	updateNotifier.check();
	return updateNotifier;
};

module.exports.Notifier = Notifier;
module.exports.PackageUpdateNotifier = PackageUpdateNotifier;
module.exports.UpdateChecker = UpdateChecker;

module.exports.UpdateNotifier = PackageUpdateNotifier;
