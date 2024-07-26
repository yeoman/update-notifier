import process from 'node:process';
import fs from 'node:fs';
import test from 'ava';
import esmock from 'esmock';

const generateSettings = (options = {}) => ({
	pkg: {
		name: 'update-notifier-tester',
		version: '0.0.2',
	},
	distTag: options.distTag,
});

let argv;
let configstorePath;

test.beforeEach(() => {
	// Prevents NODE_ENV 'test' default behavior which disables `update-notifier`
	process.env.NODE_ENV = 'ava-test';

	argv = [...process.argv];
});

test.afterEach(() => {
	delete process.env.NO_UPDATE_NOTIFIER;
	process.argv = argv;

	setTimeout(() => {
		try {
			fs.unlinkSync(configstorePath);
		} catch {}
	}, 10_000);
});

test('fetch info', async t => {
	const updateNotifier = await esmock('../index.js', undefined, {'is-in-ci': false});
	configstorePath = updateNotifier(generateSettings()).config.path;
	const update = await updateNotifier(generateSettings()).fetchInfo();
	console.log(update);
	t.is(update.latest, '0.0.2');
});

test('fetch info with dist-tag', async t => {
	const updateNotifier = await esmock('../index.js', undefined, {'is-in-ci': false});
	configstorePath = updateNotifier(generateSettings()).config.path;
	const update = await updateNotifier(generateSettings({distTag: '0.0.3-rc1'})).fetchInfo();
	t.is(update.latest, '0.0.3-rc1');
});

test('don\'t initialize configStore when NO_UPDATE_NOTIFIER is set', async t => {
	const updateNotifier = await esmock('../index.js', undefined, {'is-in-ci': false});
	configstorePath = updateNotifier(generateSettings()).config.path;
	process.env.NO_UPDATE_NOTIFIER = '1';
	const notifier = updateNotifier(generateSettings());
	t.is(notifier.config, undefined);
});

test('don\'t initialize configStore when --no-update-notifier is set', async t => {
	const updateNotifier = await esmock('../index.js', undefined, {'is-in-ci': false});
	configstorePath = updateNotifier(generateSettings()).config.path;
	process.argv.push('--no-update-notifier');
	const notifier = updateNotifier(generateSettings());
	t.is(notifier.config, undefined);
});

test('don\'t initialize configStore when NODE_ENV === "test"', async t => {
	process.env.NODE_ENV = 'test';
	const updateNotifier = await esmock('../index.js', undefined, {'is-in-ci': false});
	const notifier = updateNotifier(generateSettings());
	t.is(notifier.config, undefined);
});
