import fs from 'fs';
import test from 'ava';
import mockRequire from 'mock-require';

mockRequire('is-ci', false);

// eslint-disable-next-line import/first
import updateNotifier from '..';

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

test('check immediately', async t => {
	const update = await updateNotifier(generateSettings()).checkImmediately();
	console.log(update);
	t.is(update.latest, '0.0.2');
});

test('check immeditely with dist-tag', async t => {
	const update = await updateNotifier(generateSettings({distTag: '0.0.3-rc1'})).checkImmediately();
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
