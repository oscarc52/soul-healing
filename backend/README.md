# Xinhu Backend

Zero-dependency Node.js HTTP backend for the 心潮 / 心湖 server web project.

This backend provides API routes and serves the existing static front-end UI. It must not change the front-end page structure, copy, buttons, animation timing, or Ritual four-stage flow.

## Runtime

This service uses only Node.js built-in modules. No external npm dependencies are required.

You can run it directly without `npm install`:

```bash
node src/server.js
```

Or use the script:

```bash
npm run dev
```

The service listens on port `3001` by default. Set `PORT` to override it.

After startup, open the front-end through the backend:

```text
http://localhost:3001/
```

Use this URL for local integration instead of opening the HTML with `file:///`.

## Production Start

```bash
npm start
```

## Health Check

```bash
curl http://localhost:3001/api/health
```

Expected response:

```json
{
  "ok": true,
  "data": {
    "service": "xinhu-backend",
    "status": "healthy"
  },
  "error": null
}
```

## Static Front-End

The backend serves the existing front-end files from `design_handoff_xinhu_ritual`:

- `GET /` -> `心湖 · 交互重设计.html`
- `GET /ritual.js` -> `ritual.js`
- `GET /ritual-api.js` -> `ritual-api.js`
- `GET /original-soul-healing-website.html` -> `original-soul-healing-website.html`
- `GET /README.md` -> `README.md`

API routes keep priority over static file routes.

## API List

### GET /api/health

Returns service health.

### POST /api/ritual/insight

Generates a mock Ritual insight from transcript text. Normal records are saved to in-memory storage. Crisis records are not saved.

### GET /api/ritual/sessions

Lists saved sessions for an anonymous user.

Query:

- `anonymousId`: optional, defaults to `anonymous_mock_user`
- `limit`: optional, defaults to `30`, max `100`

The list does not return raw `transcript`.

### GET /api/ritual/patterns

Returns rule-based 7-day or 30-day patterns from in-memory sessions.

Query:

- `anonymousId`: optional, defaults to `anonymous_mock_user`
- `range`: optional, supports `7d` or `30d`, defaults to `30d`

### DELETE /api/user/data

Soft-deletes all in-memory sessions for an anonymous user.

### DELETE /api/ritual/sessions/:sessionId

Soft-deletes one session when it belongs to the current anonymous user.

### POST /api/ritual/sessions/:sessionId/feedback

Records feedback for one session. Later feedback overwrites earlier feedback for the same session.

Allowed `rating` values:

- `accurate`
- `somewhat`
- `inaccurate`

Allowed card values for `mostUsefulCard` and `missedCard`:

- `struggle`
- `pattern`
- `question`
- `null`

Allowed `tonePreference` values:

- `more_direct`
- `softer`
- `current`
- `null`

## Error Codes

- `TRANSCRIPT_EMPTY`: no analyzable transcript was provided
- `TRANSCRIPT_TOO_SHORT`: transcript is too short to form a stable insight
- `INVALID_JSON`: request body is not valid JSON
- `INVALID_RANGE`: `range` only supports `7d` or `30d`
- `SESSION_NOT_FOUND`: session does not exist, belongs to another anonymous user, or was deleted
- `INVALID_FEEDBACK_RATING`: feedback rating is not supported
- `INVALID_FEEDBACK_CARD`: feedback card field is not supported
- `INVALID_TONE_PREFERENCE`: tone preference is not supported

## Smoke Test

Start the service first:

```bash
npm run dev
```

Open another terminal and run:

```bash
npm run smoke
```

The smoke test uses `http://localhost:3001` by default. Override with `API_BASE_URL`:

```bash
API_BASE_URL=http://localhost:3001 npm run smoke
```

The script checks health, insight generation, session history, patterns, feedback, empty transcript validation, crisis handling, session deletion, and cleanup.

## Local Front-End Integration

Start the backend:

```bash
node src/server.js
```

Open:

```text
http://localhost:3001/
```

In the browser console, enable backend integration:

```js
window.XINHU_USE_BACKEND = true
delete window.XINHU_DEV_TRANSCRIPT
```

Then run the Ritual flow from the existing UI.

## 当前联调验收状态

- 当前后端为零依赖 Node 原生 HTTP 服务。
- 当前支持 API 和静态前端托管。
- 访问 `http://localhost:3001/` 可打开现有心湖前端。
- 访问 `http://localhost:3001/api/health` 可检查后端。
- Smoke test 已覆盖：
  - health
  - insight
  - sessions
  - patterns
  - feedback
  - delete
  - crisis fallback
- 当前人工验证已通过：
  - 浏览器语音识别 transcript
  - 后端生成洞察
  - session 保存
  - 7 天模式统计
- 当前仍未接：
  - 数据库
  - AI
  - 正式上线隐私口径
  - 生产部署

## Current Limits

- Current storage uses SQLite persistence through Node.js `node:sqlite`.
- Current insight generation is rule-based mock logic; AI is not connected.
- Front-end integration is available for local testing behind the existing development flag; production integration is not finalized.
- Audio is not saved.

## v0.2 SQLite Persistence

The backend now stores Ritual sessions, tags, feedback, and soft-delete state in SQLite.

- Runtime requirement: Node.js 24+.
- SQLite implementation: Node.js built-in `node:sqlite`.
- `node:sqlite` may print an experimental warning in the current runtime.
- Database file path: `backend/data/xinhu.sqlite`.
- SQLite database files are local runtime data and must not be committed.
- Saved sessions now remain available after the service restarts.
- Deletes are soft deletes: records are marked deleted instead of being physically removed.

To clear local development data:

1. Stop the backend service.
2. Delete `backend/data/xinhu.sqlite`.
3. Start the backend service again.
