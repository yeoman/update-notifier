/*global describe, it, afterEach */
'use strict';
var assert = require('assert');
var fs = require('fs');
var updateNotifier = require('../lib/update-notifier');

describe('updateNotifier', function() {
	var generateSettings = function (options) {
		options = options || {};
		return {
			packageName: options.packageName || 'update-notifier-tester',
			packageVersion: options.packageVersion || '0.0.2',
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
