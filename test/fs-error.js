import clearModule from 'clear-module';
import test from 'ava';

let updateNotifier;

test.before(() => {
	['.', 'configstore', 'xdg-basedir'].forEach(clearModule);
	// Set configstore.config to something
	// that requires root access
	process.env.XDG_CONFIG_HOME = '/usr';
	updateNotifier = require('..');
});

test('fail gracefully', t => {
	t.notThrows(() => {
		updateNotifier({
			packageName: 'npme',
			packageVersion: '3.7.0'
		});
	});
});
