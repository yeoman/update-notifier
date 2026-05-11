import process from 'node:process';
import {execFile} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import test from 'ava';
import stripAnsi from 'strip-ansi';

const execFileAsync = promisify(execFile);
const fixturePath = fileURLToPath(new URL('fixtures/cached-update.js', import.meta.url));

test('notifies about a cached update from a child process', async t => {
	const configHome = fs.mkdtempSync(path.join(os.tmpdir(), 'update-notifier-integration-'));
	const configstoreDirectory = path.join(configHome, 'configstore');
	const configstoreFile = path.join(configstoreDirectory, 'update-notifier-update-notifier-integration-test.json');
	const env = {
		...process.env,
		CI: 'false',
		NODE_ENV: 'ava-test',
		XDG_CONFIG_HOME: configHome,
	};

	t.teardown(() => {
		try {
			fs.unlinkSync(configstoreFile);
		} catch {}

		try {
			fs.rmdirSync(configstoreDirectory);
		} catch {}

		try {
			fs.rmdirSync(configHome);
		} catch {}
	});

	delete env.CONTINUOUS_INTEGRATION;
	for (const key of Object.keys(env)) {
		if (key.startsWith('CI_')) {
			delete env[key];
		}
	}

	await execFileAsync(process.execPath, [fixturePath, '--seed'], {env});

	const {stdout, stderr} = await execFileAsync(process.execPath, [fixturePath], {env});
	const output = stripAnsi(`${stdout}\n${stderr}`);

	t.true(output.includes('Update available 1.0.0 → 2.0.0'));
	t.true(output.includes('Run npm i update-notifier-integration-test to update'));
});
