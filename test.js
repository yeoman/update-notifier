/* eslint-env mocha */
'use strict';
var assert = require('assert');
var fs = require('fs');
var clearRequire = require('clear-require');
var updateNotifier = require('./');

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
		clearRequire('./');
		clearRequire('configstore');
		clearRequire('xdg-basedir');
		// set configstore.config to something
		// that requires root access
		process.env.XDG_CONFIG_HOME = '/usr';
		updateNotifier = require('./');
	});

	after(function () {
		clearRequire('./');
		clearRequire('configstore');
		clearRequire('xdg-basedir');
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
