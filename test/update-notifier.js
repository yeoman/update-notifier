import process from 'node:process';
import fs from 'node:fs';
import test from 'ava';
import esmock from 'esmock';

const generateSettings = (options = {}) => ({
	pkg: {
		name: options.name ?? 'update-notifier-tester',
		version: options.version ?? '0.0.2',
	},
	distTag: options.distTag,
	updateCheckInterval: options.updateCheckInterval,
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

test('constructor supports deprecated packageName and packageVersion options', async t => {
	const {default: UpdateNotifier} = await esmock('../update-notifier.js', {'is-in-ci': false});
	const notifier = new UpdateNotifier({
		packageName: 'update-notifier-legacy-tester',
		packageVersion: '1.2.3',
	});

	configstorePath = notifier.config.path;

	t.is(notifier._packageName, 'update-notifier-legacy-tester');
});

test('check uses cached update info and refreshes current version', async t => {
	const {default: UpdateNotifier} = await esmock('../update-notifier.js', {'is-in-ci': false});
	const notifier = new UpdateNotifier(generateSettings({
		name: 'update-notifier-cache-tester',
		version: '2.0.0',
	}));

	configstorePath = notifier.config.path;
	notifier.config.set('update', {
		latest: '3.0.0',
		current: '1.0.0',
		type: 'major',
		name: 'update-notifier-cache-tester',
	});

	notifier.check();

	t.deepEqual(notifier.update, {
		latest: '3.0.0',
		current: '2.0.0',
		type: 'major',
		name: 'update-notifier-cache-tester',
	});
	t.is(notifier.config.get('update'), undefined);
});

test('check spawns detached update process after interval elapses', async t => {
	let spawnArguments;
	let unrefCalled = false;
	const spawn = (...arguments_) => {
		spawnArguments = arguments_;
		return {
			unref() {
				unrefCalled = true;
			},
		};
	};

	const {default: UpdateNotifier} = await esmock('../update-notifier.js', {
		'node:child_process': {spawn},
		'is-in-ci': false,
	});
	const notifier = new UpdateNotifier(generateSettings({
		name: 'update-notifier-spawn-tester',
		updateCheckInterval: 0,
	}));

	configstorePath = notifier.config.path;
	notifier.config.set('lastUpdateCheck', 0);

	notifier.check();

	t.true(spawnArguments[1][0].endsWith('/check.js'));
	t.is(JSON.parse(spawnArguments[1][1]).pkg.name, 'update-notifier-spawn-tester');
	t.deepEqual(spawnArguments[2], {
		detached: true,
		stdio: 'ignore',
	});
	t.true(unrefCalled);
});
