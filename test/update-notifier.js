import fs from 'fs';
import test from 'ava';
import mockRequire from 'mock-require';

mockRequire('is-ci', false);

// eslint-disable-next-line import/first
import updateNotifier from '..';

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

test('check for update', async t => {
	const update = await updateNotifier(generateSettings()).checkNpm();
	t.is(update.current, '0.0.2');
});

test.cb('check for update with callback', t => {
	t.plan(1);

	updateNotifier(generateSettings({
		callback: () => {
			t.pass();
			t.end();
		}
	}));
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
