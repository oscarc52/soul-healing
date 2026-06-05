import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadEnv } from '../src/env/loadEnv.js';

const TEMP_FILE = path.join(os.tmpdir(), `xinhu-env-loader-${process.pid}.env`);
const MISSING_FILE = path.join(os.tmpdir(), `xinhu-env-loader-missing-${process.pid}.env`);
const MANAGED_KEYS = [
  'XINHU_LOADER_ALPHA',
  'XINHU_LOADER_DOUBLE',
  'XINHU_LOADER_SINGLE',
  'XINHU_LOADER_EXISTING',
  'XINHU_LOADER_EMPTY'
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function cleanup() {
  for (const key of MANAGED_KEYS) {
    delete process.env[key];
  }

  fs.rmSync(TEMP_FILE, { force: true });
  fs.rmSync(MISSING_FILE, { force: true });
}

function writeTestEnv() {
  fs.writeFileSync(
    TEMP_FILE,
    [
      '',
      '# comment only',
      'XINHU_LOADER_ALPHA=plain_value',
      'XINHU_LOADER_DOUBLE="double quoted value"',
      "XINHU_LOADER_SINGLE='single quoted value'",
      'XINHU_LOADER_EXISTING=from_file',
      'XINHU_LOADER_EMPTY=',
      ''
    ].join('\n'),
    'utf8'
  );
}

try {
  cleanup();
  process.env.XINHU_LOADER_EXISTING = 'from_process';
  writeTestEnv();

  const result = loadEnv({ path: TEMP_FILE });

  assert(result.loaded === true, 'Existing env file should return loaded=true.');
  assert(result.path === TEMP_FILE, 'Result path should match the requested env file.');
  assert(process.env.XINHU_LOADER_ALPHA === 'plain_value', 'KEY=value was not loaded.');
  assert(process.env.XINHU_LOADER_DOUBLE === 'double quoted value', 'KEY=\"value\" was not loaded.');
  assert(process.env.XINHU_LOADER_SINGLE === 'single quoted value', "KEY='value' was not loaded.");
  assert(process.env.XINHU_LOADER_EXISTING === 'from_process', 'Existing process.env value was overwritten.');
  assert(process.env.XINHU_LOADER_EMPTY === '', 'Empty value was not loaded as an empty string.');
  assert(result.keys.includes('XINHU_LOADER_ALPHA'), 'Loaded key name was not returned.');
  assert(!result.keys.includes('plain_value'), 'Result keys must not include values.');
  assert(!result.keys.includes('from_file'), 'Result keys must not include skipped values.');
  assert(!result.keys.includes('from_process'), 'Result keys must not include process values.');

  const missing = loadEnv({ path: MISSING_FILE });
  assert(missing.loaded === false, 'Missing env file should return loaded=false.');
  assert(Array.isArray(missing.keys) && missing.keys.length === 0, 'Missing env file should return empty keys.');

  console.log('Xinhu env loader test passed.');
} finally {
  cleanup();
}
