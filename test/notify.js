import process from 'node:process';
import {inherits} from 'node:util';
import FixtureStdout from 'fixture-stdout';
import stripAnsi from 'strip-ansi';
import test from 'ava';
import esmock from 'esmock';

const stderr = new FixtureStdout({
	stream: process.stderr,
});

function Control(shouldNotifyInNpmScript) {
	this._packageName = 'update-notifier-tester';
	this.update = {
		current: '0.0.2',
		latest: '1.0.0',
	};
	this._shouldNotifyInNpmScript = shouldNotifyInNpmScript;
}

const setupTest = async isNpmReturnValue => {
	process.stdout.isTTY = true;

	const UpdateNotifier = await esmock('../update-notifier.js', {
		'is-npm': {isNpmOrYarn: isNpmReturnValue || false},
	});

	inherits(Control, UpdateNotifier);
};

let errorLogs = '';

test.beforeEach(async () => {
	await setupTest();

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

	console.log('d', errorLogs);

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
		message: 'custom message',
	});

	t.true(stripAnsi(errorLogs).includes('custom message'));
});

test('supports message with placeholders', t => {
	const notifier = new Control();
	notifier.notify({
		defer: false,
		isGlobal: true,
		message: [
			'Package Name: {packageName}',
			'Current Version: {currentVersion}',
			'Latest Version: {latestVersion}',
			'Update Command: {updateCommand}',
		].join('\n'),
	});

	t.is(stripAnsi(errorLogs), `
   ╭─────────────────────────────────────────────────────╮
   │                                                     │
   │        Package Name: update-notifier-tester         │
   │               Current Version: 0.0.2                │
   │                Latest Version: 1.0.0                │
   │   Update Command: npm i -g update-notifier-tester   │
   │                                                     │
   ╰─────────────────────────────────────────────────────╯

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

test('suppress output when running as npm script', async t => {
	await setupTest(true);
	const notifier = new Control();
	notifier.notify({defer: false});
	t.false(stripAnsi(errorLogs).includes('Update available'));
});

test('should output if running as npm script and shouldNotifyInNpmScript option set', async t => {
	await setupTest(true);
	const notifier = new Control(true);
	notifier.notify({defer: false});
	t.true(stripAnsi(errorLogs).includes('Update available'));
});

test('should not output if current version is the latest', async t => {
	await setupTest(true);
	const notifier = new Control(true);
	notifier.update.current = '1.0.0';
	notifier.notify({defer: false});
	t.false(stripAnsi(errorLogs).includes('Update available'));
});

test('should not output if current version is more recent than the reported latest', async t => {
	await setupTest(true);
	const notifier = new Control(true);
	notifier.update.current = '1.0.1';
	notifier.notify({defer: false});
	t.false(stripAnsi(errorLogs).includes('Update available'));
});
