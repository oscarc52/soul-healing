import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getDefaultEnvPath() {
  return path.resolve(__dirname, '..', '..', '.env');
}

function parseEnvLine(line) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);

  if (!match) {
    return null;
  }

  const key = match[1];
  let value = match[2].trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return {
    key,
    value
  };
}

export function loadEnv(options = {}) {
  const envPath = options.path || getDefaultEnvPath();

  if (!fs.existsSync(envPath)) {
    return {
      loaded: false,
      path: envPath,
      keys: []
    };
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const keys = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const parsed = parseEnvLine(line);

    if (!parsed || Object.prototype.hasOwnProperty.call(process.env, parsed.key)) {
      continue;
    }

    process.env[parsed.key] = parsed.value;
    keys.push(parsed.key);
  }

  return {
    loaded: true,
    path: envPath,
    keys
  };
}
