import process from 'node:process';
import clearModule from 'clear-module';
import test from 'ava';

for (const name of ['..', 'configstore', 'xdg-basedir']) {
	clearModule(name);
}

// Set configstore.config to something that requires root access
process.env.XDG_CONFIG_HOME = '/usr';
const {default: updateNotifier} = await import('../index.js');

test('fail gracefully', t => {
	t.notThrows(() => {
		updateNotifier({
			packageName: 'npme',
			packageVersion: '3.7.0',
		});
	});
});
