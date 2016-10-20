'use strict';

var lazyRequire = require('lazy-req')(require);

var chalk = lazyRequire('chalk');

var Notifier = require('../index.js').Notifier;
var UpdateChecker = require('../index.js').UpdateChecker;

function CustomNotifier(options) {
	this.options = options = options || {};

	this.updateChecker = new UpdateChecker({
		currentVersion: '1.0.0',
		getLatest: function () {
			// asynchronously retrieve latest version from remote
			// does not have to be an NPM look-up, could be anything
			return Promise.resolve('1.2.3');
		},
		updaterName: 'custom'
	});
}

CustomNotifier.prototype.check = function () {
	return this.updateChecker.check();
};

CustomNotifier.prototype.notify = function (opts) {
	var notifier = new Notifier();

	opts = opts || {};

	opts.update = (this.updateChecker && this.updateChecker.update) || {};

	opts.message = opts.message || 'Update available ' + chalk().dim(opts.update.current) + chalk().reset(' → ') +
		chalk().green(opts.update.latest) + ' \nRun ' + chalk().cyan('custom update command') + ' to update';

	return notifier.notify(opts);
};

module.exports = function (options) {
	var updateNotifier = new CustomNotifier(options);
	updateNotifier.check();
	return updateNotifier;
};

module.exports.CustomNotifier = CustomNotifier;
