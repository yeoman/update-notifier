import process from 'node:process';
import ConfigStore from 'configstore';
import updateNotifier from '../../index.js';

const packageName = 'update-notifier-integration-test';
const packageVersion = '1.0.0';

const config = new ConfigStore(`update-notifier-${packageName}`, {
	optOut: false,
	lastUpdateCheck: Date.now(),
});

if (process.argv.includes('--seed')) {
	config.set('update', {
		latest: '2.0.0',
		current: '0.0.0',
		type: 'major',
		name: packageName,
	});
} else {
	process.stdout.isTTY = true;
	updateNotifier({
		pkg: {
			name: packageName,
			version: packageVersion,
		},
		shouldNotifyInNpmScript: true,
	}).notify({defer: false, isGlobal: false});
}
