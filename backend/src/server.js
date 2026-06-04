import http from 'http';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  compactText,
  hasCrisisRisk,
  normalizeTranscript,
  pickMockInsight
} from './utils/insightMock.js';
import {
  deleteAllSessions,
  deleteSession,
  getSessionSnapshot,
  listSessions,
  saveSession,
  updateFeedback
} from './store/sqliteStore.js';
import { closeDatabase, initDatabase } from './db/sqlite.js';
import { validateFeedbackPayload } from './utils/feedback.js';
import { buildPatterns } from './utils/patterns.js';

const DEFAULT_PORT = 3001;
const DEFAULT_ANONYMOUS_ID = 'anonymous_mock_user';
const MAX_BODY_BYTES = 1024 * 1024;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const FRONTEND_DIR = path.resolve(PROJECT_ROOT, 'design_handoff_xinhu_ritual');
const FRONTEND_INDEX = '心湖 · 交互重设计.html';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function normalizeAnonymousId(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_ANONYMOUS_ID;
}

function normalizeDurationSeconds(value) {
  return Number.isFinite(value) ? value : 0;
}

function normalizeTimezone(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : 'Asia/Shanghai';
}

function normalizeLimit(value) {
  const parsed = Number.parseInt(value || '30', 10);
  return Number.isFinite(parsed) ? parsed : 30;
}

function normalizeRange(value) {
  return value || '30d';
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    ...CORS_HEADERS,
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(body));
}

function sendNoContent(response) {
  response.writeHead(204, CORS_HEADERS);
  response.end();
}

function sendBusinessError(response, statusCode, code, message) {
  sendJson(response, statusCode, {
    ok: false,
    data: null,
    error: {
      code,
      message
    }
  });
}

function sendStaticNotFound(response) {
  response.writeHead(404, {
    ...CORS_HEADERS,
    'Content-Type': 'text/plain; charset=utf-8'
  });
  response.end('Not found');
}

function resolveStaticPath(pathname) {
  let relativePath;

  try {
    relativePath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  if (relativePath === '/') {
    relativePath = '/' + FRONTEND_INDEX;
  }

  const normalizedRelativePath = relativePath.replace(/^\/+/, '');
  const filePath = path.resolve(FRONTEND_DIR, normalizedRelativePath);
  const allowedRoot = FRONTEND_DIR + path.sep;

  if (filePath !== FRONTEND_DIR && !filePath.startsWith(allowedRoot)) {
    return null;
  }

  return filePath;
}

async function handleStaticFile(request, response, pathname) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendBusinessError(response, 404, 'NOT_FOUND', '接口不存在');
    return;
  }

  const filePath = resolveStaticPath(pathname);

  if (!filePath) {
    sendStaticNotFound(response);
    return;
  }

  let fileStat;

  try {
    fileStat = await stat(filePath);
  } catch {
    sendStaticNotFound(response);
    return;
  }

  if (!fileStat.isFile()) {
    sendStaticNotFound(response);
    return;
  }

  response.writeHead(200, {
    ...CORS_HEADERS,
    'Content-Type': CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Content-Length': fileStat.size
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let rawBody = '';

    request.setEncoding('utf8');

    request.on('data', (chunk) => {
      rawBody += chunk;

      if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
        reject(new Error('BODY_TOO_LARGE'));
        request.destroy();
      }
    });

    request.on('end', () => {
      if (!rawBody) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch {
        reject(new SyntaxError('INVALID_JSON'));
      }
    });

    request.on('error', reject);
  });
}

function extractSessionDeletePath(pathname) {
  const match = pathname.match(/^\/api\/ritual\/sessions\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function extractFeedbackPath(pathname) {
  const match = pathname.match(/^\/api\/ritual\/sessions\/([^/]+)\/feedback$/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function handleHealth(response) {
  sendJson(response, 200, {
    ok: true,
    data: {
      service: 'xinhu-backend',
      status: 'healthy'
    },
    error: null
  });
}

async function handleInsight(request, response) {
  const body = await readJsonBody(request);
  const transcript = normalizeTranscript(body.transcript);

  if (!transcript) {
    sendBusinessError(response, 400, 'TRANSCRIPT_EMPTY', '没有识别到可分析的内容');
    return;
  }

  if (compactText(transcript).length < 8) {
    sendBusinessError(response, 400, 'TRANSCRIPT_TOO_SHORT', '内容太短，暂时无法形成稳定洞察');
    return;
  }

  const anonymousId = normalizeAnonymousId(body.anonymousId);
  const durationSeconds = normalizeDurationSeconds(body.durationSeconds);
  const timezone = normalizeTimezone(body.timezone);

  if (hasCrisisRisk(transcript)) {
    sendJson(response, 200, {
      ok: true,
      data: {
        sessionId: `session_${Date.now()}`,
        insight: null,
        meta: {
          emotionLabel: '混合',
          tags: [],
          riskLevel: 'crisis',
          saved: false
        },
        safetyMessage: '你刚才提到的内容包含较高现实风险。请立刻联系身边可信任的人，或当地紧急援助渠道。'
      },
      error: null
    });
    return;
  }

  const result = pickMockInsight(transcript);
  const session = saveSession({
    anonymousId,
    transcript,
    durationSeconds,
    timezone,
    insight: result.insight,
    emotionLabel: result.emotionLabel,
    tags: result.tags
  });

  sendJson(response, 200, {
    ok: true,
    data: {
      sessionId: session.id,
      insight: result.insight,
      meta: {
        emotionLabel: result.emotionLabel,
        tags: result.tags,
        riskLevel: 'normal',
        saved: true
      }
    },
    error: null
  });
}

async function handleListSessions(url, response) {
  const anonymousId = normalizeAnonymousId(url.searchParams.get('anonymousId'));
  const limit = normalizeLimit(url.searchParams.get('limit'));

  sendJson(response, 200, {
    ok: true,
    data: listSessions(anonymousId, limit),
    error: null
  });
}

async function handlePatterns(url, response) {
  const anonymousId = normalizeAnonymousId(url.searchParams.get('anonymousId'));
  const range = normalizeRange(url.searchParams.get('range'));

  if (range !== '7d' && range !== '30d') {
    sendBusinessError(response, 400, 'INVALID_RANGE', 'range 只支持 7d 或 30d');
    return;
  }

  sendJson(response, 200, {
    ok: true,
    data: buildPatterns({
      sessions: getSessionSnapshot(),
      anonymousId,
      range
    }),
    error: null
  });
}

async function handleDeleteAllData(request, response) {
  const body = await readJsonBody(request);
  const anonymousId = normalizeAnonymousId(body.anonymousId);
  const deletedCount = deleteAllSessions(anonymousId);

  sendJson(response, 200, {
    ok: true,
    data: {
      deletedCount
    },
    error: null
  });
}

async function handleDeleteSession(request, response, sessionId) {
  const body = await readJsonBody(request);
  const anonymousId = normalizeAnonymousId(body.anonymousId);
  const session = deleteSession(anonymousId, sessionId);

  if (!session) {
    sendBusinessError(response, 404, 'SESSION_NOT_FOUND', '没有找到对应的心湖记录');
    return;
  }

  sendJson(response, 200, {
    ok: true,
    data: {
      sessionId: session.id,
      deleted: true
    },
    error: null
  });
}

async function handleFeedback(request, response, sessionId) {
  const body = await readJsonBody(request);
  const anonymousId = normalizeAnonymousId(body.anonymousId);
  const validation = validateFeedbackPayload(body);

  if (!validation.ok) {
    sendJson(response, 400, {
      ok: false,
      data: null,
      error: validation.error
    });
    return;
  }

  const session = updateFeedback(anonymousId, sessionId, validation.feedback);

  if (!session) {
    sendBusinessError(response, 404, 'SESSION_NOT_FOUND', '没有找到对应的心湖记录');
    return;
  }

  sendJson(response, 200, {
    ok: true,
    data: {
      sessionId: session.id,
      feedback: session.feedback
    },
    error: null
  });
}

async function routeRequest(request, response) {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const { method } = request;
  const { pathname } = url;

  if (method === 'OPTIONS') {
    sendNoContent(response);
    return;
  }

  if (method === 'GET' && pathname === '/api/health') {
    await handleHealth(response);
    return;
  }

  if (method === 'POST' && pathname === '/api/ritual/insight') {
    await handleInsight(request, response);
    return;
  }

  if (method === 'GET' && pathname === '/api/ritual/sessions') {
    await handleListSessions(url, response);
    return;
  }

  if (method === 'GET' && pathname === '/api/ritual/patterns') {
    await handlePatterns(url, response);
    return;
  }

  if (method === 'DELETE' && pathname === '/api/user/data') {
    await handleDeleteAllData(request, response);
    return;
  }

  const feedbackSessionId = extractFeedbackPath(pathname);
  if (method === 'POST' && feedbackSessionId) {
    await handleFeedback(request, response, feedbackSessionId);
    return;
  }

  const deleteSessionId = extractSessionDeletePath(pathname);
  if (method === 'DELETE' && deleteSessionId) {
    await handleDeleteSession(request, response, deleteSessionId);
    return;
  }

  await handleStaticFile(request, response, pathname);
}

export function buildServer() {
  return http.createServer(async (request, response) => {
    try {
      await routeRequest(request, response);
    } catch (error) {
      if (error instanceof SyntaxError && error.message === 'INVALID_JSON') {
        sendBusinessError(response, 400, 'INVALID_JSON', '请求内容不是合法 JSON');
        return;
      }

      console.error(error);
      sendBusinessError(response, 500, 'INTERNAL_SERVER_ERROR', '服务暂时无法处理请求');
    }
  });
}

function start() {
  initDatabase();

  const server = buildServer();
  const port = Number.parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
  let isShuttingDown = false;

  function shutdown() {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    server.close(() => {
      closeDatabase();
      process.exit(0);
    });
  }

  server.listen(port, () => {
    console.log(`Xinhu backend listening on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    console.error(error);
    closeDatabase();
    process.exit(1);
  });

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('exit', closeDatabase);
}

start();
