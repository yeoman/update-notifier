'use strict';
var assert = require('assert');
var fs = require('fs');
var updateNotifier = require('./');

describe('updateNotifier', function() {
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

	beforeEach(function() {
		configstorePath = updateNotifier(generateSettings()).config.path;
	});

	afterEach(function() {
		setTimeout(function () {
			fs.unlinkSync(configstorePath);
		}, 10000);
	});

	it('should check for update', function(cb) {
		updateNotifier(generateSettings()).checkNpm(function(error, update) {
			assert.equal(update.current, '0.0.2');
			cb();
		});
	});

	it('should check for update with callback', function(cb) {
		updateNotifier(generateSettings({
			callback: cb
		}));
	});
});
