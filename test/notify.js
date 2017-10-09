import util from 'util';
import clearModule from 'clear-module';
import FixtureStdout from 'fixture-stdout';
import stripAnsi from 'strip-ansi';
import test from 'ava';

const stderr = new FixtureStdout({
	stream: process.stderr
});
let updateNotifier = require('..');

test.before(() => {
	['.', 'is-npm'].forEach(clearModule);
	['npm_config_username', 'npm_package_name', 'npm_config_heading'].forEach(name => {
		delete process.env[name];
	});
	process.stdout.isTTY = true;
	updateNotifier = require('..');
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

test.beforeEach(() => {
	stderr.capture(s => {
		errorLogs += s;
		return false;
	});
});

test.afterEach(() => {
	stderr.release();
	errorLogs = '';
});

test('use pretty boxen message by default', t => {
	const notifier = new Control();
	notifier.notify({defer: false, isGlobal: true});

	t.is(stripAnsi(errorLogs), `

   ╭───────────────────────────────────────────────────╮
   │                                                   │
   │          Update available 0.0.2 → 1.0.0           │
   │   Run npm i -g update-notifier-tester to update   │
   │                                                   │
   ╰───────────────────────────────────────────────────╯

`);
});

test('exclude -g argument when `isGlobal` option is `false`', t => {
	const notifier = new Control();
	notifier.notify({defer: false, isGlobal: false});
	t.not(stripAnsi(errorLogs).indexOf('Run npm i update-notifier-tester to update'), -1);
});
