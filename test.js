/* eslint-env mocha */
'use strict';
const assert = require('assert');
const fs = require('fs');
const util = require('util');
const clearModule = require('clear-module');
const FixtureStdout = require('fixture-stdout');
const stripAnsi = require('strip-ansi');
let updateNotifier = require('.');

describe('updateNotifier', () => {
	const generateSettings = options => {
		options = options || {};
		return {
			pkg: {
				name: 'update-notifier-tester',
				version: '0.0.2'
			},
			callback: options.callback || null
		};
	};

	let configstorePath;

	beforeEach(() => {
		configstorePath = updateNotifier(generateSettings()).config.path;
	});

	afterEach(() => {
		setTimeout(() => {
			fs.unlinkSync(configstorePath);
		}, 10000);
	});

	it('should check for update', () => {
		return updateNotifier(generateSettings()).checkNpm().then(update => {
			assert.equal(update.current, '0.0.2');
		});
	});

	it('should check for update with callback', cb => {
		updateNotifier(generateSettings({
			callback: cb
		}));
	});
});

describe('updateNotifier with fs error', () => {
	before(() => {
		['.', 'configstore', 'xdg-basedir'].forEach(clearModule);
		// Set configstore.config to something
		// that requires root access
		process.env.XDG_CONFIG_HOME = '/usr';
		updateNotifier = require('.');
	});

	after(() => {
		['.', 'configstore', 'xdg-basedir'].forEach(clearModule);
		delete process.env.XDG_CONFIG_HOME;
		updateNotifier = require('.');
	});

	it('should fail gracefully', () => {
		assert.doesNotThrow(() => {
			updateNotifier({
				packageName: 'npme',
				packageVersion: '3.7.0'
			});
		});
	});
});

describe('notify(opts)', () => {
	const stderr = new FixtureStdout({
		stream: process.stderr
	});
	let processEnvBefore;
	let isTTYBefore;

	before(() => {
		['.', 'is-npm'].forEach(clearModule);
		processEnvBefore = JSON.stringify(process.env);
		isTTYBefore = process.stdout.isTTY;
		['npm_config_username', 'npm_package_name', 'npm_config_heading'].forEach(name => {
			delete process.env[name];
		});
		process.stdout.isTTY = true;
		updateNotifier = require('.');
	});

	after(() => {
		['.', 'is-npm'].forEach(clearModule);
		process.env = JSON.parse(processEnvBefore);
		process.stdout.isTTY = isTTYBefore;
		processEnvBefore = undefined;
		isTTYBefore = undefined;
		updateNotifier = require('.');
	});

	function Control() {
		this.packageName = 'update-notifier-tester';
		this.update = {
			current: '0.0.2',
			latest: '1.0.0'
		};
	}
	util.inherits(Control, updateNotifier.UpdateNotifier);

	let errorLogs = '';

	beforeEach(() => {
		stderr.capture(s => {
			errorLogs += s;
			return false;
		});
	});

	afterEach(() => {
		stderr.release();
		errorLogs = '';
	});

	it('should use pretty boxen message by default', () => {
		const notifier = new Control();
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

	it('should exclude -g argument when `isGlobal` option is `false`', () => {
		const notifier = new Control();
		notifier.notify({defer: false, isGlobal: false});
		assert.notEqual(-1, stripAnsi(errorLogs)
			.indexOf('Run npm i update-notifier-tester to update'));
	});
});
