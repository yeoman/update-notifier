/*global describe, it, afterEach */
'use strict';
var assert = require('assert');
var fs = require('fs');
var updateNotifier = require('../lib/update-notifier');

describe('updateNotifier', function() {
	var generateSettings = function (options) {
		options = options || {};
		return {
			packageName: options.packageName || 'generator-backbone',
			packageVersion: options.packageVersion || '0.1.0',
			callback: options.callback || null
		};
	};

	var configstorePath;

	beforeEach(function() {
		configstorePath = updateNotifier(generateSettings()).config.path;
	});

	afterEach(function() {
		fs.unlinkSync(configstorePath);
	});

	it('should check for update', function(cb) {
		updateNotifier(generateSettings()).checkNpm(function(error, update) {
			assert.equal(update.current, '0.1.0');
			cb();
		});
	});

	it('should check for update with callback', function(cb) {
		updateNotifier(generateSettings({
			callback: cb
		}));
	});
});
