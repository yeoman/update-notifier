/* eslint-env mocha */
'use strict';
var assert = require('assert');
var fs = require('fs');
var util = require('util');
var clearRequire = require('clear-require');
var FixtureStdout = require('fixture-stdout');
var stripAnsi = require('strip-ansi');
var updateNotifier = require('./');

describe('module', function () {
	it('should export a function', function () {
		assert.equal(typeof updateNotifier, 'function');
	});

	it('should export a Notifier constructor', function () {
		assert.equal(typeof updateNotifier.Notifier, 'function');
	});

	it('should export a UpdateChecker constructor', function () {
		assert.equal(typeof updateNotifier.UpdateChecker, 'function');
	});
});

describe('updateNotifier', function () {
	var generateSettings = function (options) {
		options = options || {};
		return {
			pkg: {
				name: 'update-notifier-tester',
				version: '0.0.2'
			},
			callback: options.callback || null
		};
	};

	var configstorePath;

	beforeEach(function () {
		configstorePath = updateNotifier(generateSettings()).config.path;
	});

	afterEach(function () {
		setTimeout(function () {
			fs.unlinkSync(configstorePath);
		}, 10000);
	});

	it('should check for update', function () {
		return updateNotifier(generateSettings()).checkNpm().then(function (update) {
			assert.equal(update.current, '0.0.2');
		});
	});

	it('should check for update with callback', function (cb) {
		updateNotifier(generateSettings({
			callback: cb
		}));
	});
});

describe('updateNotifier with fs error', function () {
	before(function () {
		['./', 'configstore', 'xdg-basedir'].forEach(clearRequire);
		// set configstore.config to something
		// that requires root access
		process.env.XDG_CONFIG_HOME = '/usr';
		updateNotifier = require('./');
	});

	after(function () {
		['./', 'configstore', 'xdg-basedir'].forEach(clearRequire);
		delete process.env.XDG_CONFIG_HOME;
		updateNotifier = require('./');
	});

	it('should fail gracefully', function () {
		// basically should not blow up, but config should be undefined
		assert.ifError(updateNotifier({
			packageName: 'npme',
			packageVersion: '3.7.0'
		}).config);
	});
});

describe('notify(opts)', function () {
	var stderr = new FixtureStdout({
		stream: process.stderr
	});
	var processEnvBefore;
	var isTTYBefore;

	before(function () {
		['./', 'is-npm'].forEach(clearRequire);
		processEnvBefore = JSON.stringify(process.env);
		isTTYBefore = process.stdout.isTTY;
		['npm_config_username', 'npm_package_name', 'npm_config_heading'].forEach(function (name) {
			delete process.env[name];
		});
		process.stdout.isTTY = true;
		updateNotifier = require('./');
	});

	after(function () {
		['./', 'is-npm'].forEach(clearRequire);
		process.env = JSON.parse(processEnvBefore);
		process.stdout.isTTY = isTTYBefore;
		processEnvBefore = undefined;
		isTTYBefore = undefined;
		updateNotifier = require('./');
	});

	var errorLogs = '';

	beforeEach(function () {
		stderr.capture(function (s) {
			errorLogs += s;
			return false;
		});
	});

	afterEach(function () {
		stderr.release();
		errorLogs = '';
	});

	it('should use pretty boxen message by default', function () {
		function Control() {
			this.packageName = 'update-notifier-tester';
			this.updateChecker = {
				update: {
					current: '0.0.2',
					latest: '1.0.0'
				}
			};
		}
		util.inherits(Control, updateNotifier.UpdateNotifier);
		var notifier = new Control();
		notifier.notify({defer: false});
		assert.equal(stripAnsi(errorLogs), [
			'',
			'',
			'   ╭───────────────────────────────────────────────────╮',
			'   │                                                   │',
			'   │          Update available 0.0.2 → 1.0.0           │',
			'   │   Run npm i -g update-notifier-tester to update   │',
			'   │                                                   │',
			'   ╰───────────────────────────────────────────────────╯',
			'',
			''
		].join('\n'));
	});
});
