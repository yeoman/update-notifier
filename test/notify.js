import util from 'util';
import clearModule from 'clear-module';
import FixtureStdout from 'fixture-stdout';
import stripAnsi from 'strip-ansi';
import test from 'ava';
import mock from 'mock-require';

const stderr = new FixtureStdout({
	stream: process.stderr
});

function Control(shouldNotifyInNpmScript) {
	this.packageName = 'update-notifier-tester';
	this.update = {
		current: '0.0.2',
		latest: '1.0.0'
	};
	this.shouldNotifyInNpmScript = shouldNotifyInNpmScript;
}

const setupTest = isNpmReturnValue => {
	['..', 'is-npm'].forEach(clearModule);
	process.stdout.isTTY = true;
	mock('is-npm', {isNpmOrYarn: isNpmReturnValue || false});
	const updateNotifier = require('..');
	util.inherits(Control, updateNotifier.UpdateNotifier);
};

let errorLogs = '';

test.beforeEach(() => {
	setupTest();
	stderr.capture(s => {
		errorLogs += s;
		return false;
	});
});

test.afterEach(() => {
	mock.stopAll();
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

test('supports custom message', t => {
	const notifier = new Control();
	notifier.notify({
		defer: false,
		isGlobal: true,
		message: 'custom message'
	});

	t.true(stripAnsi(errorLogs).includes('custom message'));
});

test('support message with placeholders', t => {
	const notifier = new Control();
	notifier.notify({
		defer: false,
		isGlobal: true,
		message: [
			'Name: {name}',
			'Current: {current}',
			'Latest: {latest}',
			'Command: {command}'
		].join('\n')
	});

	t.is(stripAnsi(errorLogs), `

   ╭──────────────────────────────────────────────╮
   │                                              │
   │         Name: update-notifier-tester         │
   │                Current: 0.0.2                │
   │                Latest: 1.0.0                 │
   │   Command: npm i -g update-notifier-tester   │
   │                                              │
   ╰──────────────────────────────────────────────╯

`);
});

test('exclude -g argument when `isGlobal` option is `false`', t => {
	const notifier = new Control();
	notifier.notify({defer: false, isGlobal: false});
	t.not(stripAnsi(errorLogs).indexOf('Run npm i update-notifier-tester to update'), -1);
});

test('shouldNotifyInNpmScript should default to false', t => {
	const notifier = new Control();
	notifier.notify({defer: false});
	t.not(stripAnsi(errorLogs).indexOf('Update available'), -1);
});

test('suppress output when running as npm script', t => {
	setupTest(true);
	const notifier = new Control();
	notifier.notify({defer: false});
	t.false(stripAnsi(errorLogs).includes('Update available'));
});

test('should output if running as npm script and shouldNotifyInNpmScript option set', t => {
	setupTest(true);
	const notifier = new Control(true);
	notifier.notify({defer: false});
	t.true(stripAnsi(errorLogs).includes('Update available'));
});

test('should not output if current version is the latest', t => {
	setupTest(true);
	const notifier = new Control(true);
	notifier.update.current = '1.0.0';
	notifier.notify({defer: false});
	t.false(stripAnsi(errorLogs).includes('Update available'));
});
