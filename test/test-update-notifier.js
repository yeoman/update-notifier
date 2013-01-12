/*global describe, it, afterEach */
'use strict';
var assert = require('assert');
var fs = require('fs');
var updateNotifier = require('../lib/update-notifier');

describe('updateNotifier', function() {
	var settings = {
		packageName: 'yeoman',
		packageVersion: '0.9.3'
	};

	var configstorePath = updateNotifier(settings).config.path;

	afterEach(function() {
		fs.unlinkSync(configstorePath);
	});

	it('should check for update', function(cb) {
		updateNotifier(settings).checkNpm(function(error, update) {
			assert.equal(update.current, '0.9.3');
			cb();
		});
	});
});
