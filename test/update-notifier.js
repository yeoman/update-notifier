import fs from 'fs';
import test from 'ava';
import mockRequire from 'mock-require';

mockRequire('is-ci', false);

import updateNotifier from '../index.js';

const generateSettings = (options = {}) => {
	return {
		pkg: {
			name: 'update-notifier-tester',
			version: '0.0.2'
		},
		distTag: options.distTag
	};
};

let argv;
let configstorePath;

test.beforeEach(() => {
	// Prevents NODE_ENV 'test' default behavior which disables `update-notifier`
	process.env.NODE_ENV = 'ava-test';

	argv = process.argv.slice();
	configstorePath = updateNotifier(generateSettings()).config.path;
});

test.afterEach(() => {
	delete process.env.NO_UPDATE_NOTIFIER;
	process.argv = argv;
	setTimeout(() => {
		fs.unlinkSync(configstorePath);
	}, 10000);
});

test('fetch info', async t => {
	const update = await updateNotifier(generateSettings()).fetchInfo();
	console.log(update);
	t.is(update.latest, '0.0.2');
});

test('fetch info with dist-tag', async t => {
	const update = await updateNotifier(generateSettings({distTag: '0.0.3-rc1'})).fetchInfo();
	t.is(update.latest, '0.0.3-rc1');
});

test('don\'t initialize configStore when NO_UPDATE_NOTIFIER is set', t => {
	process.env.NO_UPDATE_NOTIFIER = '1';
	const notifier = updateNotifier(generateSettings());
	t.is(notifier.config, undefined);
});

test('don\'t initialize configStore when --no-update-notifier is set', t => {
	process.argv.push('--no-update-notifier');
	const notifier = updateNotifier(generateSettings());
	t.is(notifier.config, undefined);
});

test('don\'t initialize configStore when NODE_ENV === "test"', t => {
	process.env.NODE_ENV = 'test';
	const notifier = updateNotifier(generateSettings());
	t.is(notifier.config, undefined);
});
