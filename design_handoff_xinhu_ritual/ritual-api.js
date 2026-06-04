(function(){
  'use strict';

  const API_BASE = window.XINHU_API_BASE || 'http://localhost:3001';
  const ANONYMOUS_ID_KEY = 'xinhu_anonymous_id';

  function createAnonymousId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return 'anonymous_' + window.crypto.randomUUID();
    }

    return 'anonymous_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  function getAnonymousId() {
    let anonymousId = null;

    try {
      anonymousId = window.localStorage.getItem(ANONYMOUS_ID_KEY);
    } catch (error) {
      anonymousId = null;
    }

    if (!anonymousId) {
      anonymousId = createAnonymousId();

      try {
        window.localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
      } catch (error) {
        // Keep the generated id for this call even if storage is unavailable.
      }
    }

    return anonymousId;
  }

  async function requestJson(path, options) {
    let response;

    try {
      response = await fetch(API_BASE + path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options && options.headers ? options.headers : {})
        }
      });
    } catch (error) {
      throw new Error(error && error.message ? error.message : 'Network request failed');
    }

    let json = null;

    try {
      json = await response.json();
    } catch (error) {
      json = null;
    }

    if (!response.ok) {
      const message = json && json.error && json.error.message
        ? json.error.message
        : 'API request failed';
      throw new Error(message);
    }

    return json;
  }

  function createInsight({ transcript, durationSeconds, timezone }) {
    return requestJson('/api/ritual/insight', {
      method: 'POST',
      body: JSON.stringify({
        anonymousId: getAnonymousId(),
        transcript,
        durationSeconds,
        timezone
      })
    });
  }

  function getSessions({ limit = 30 } = {}) {
    const params = new URLSearchParams({
      anonymousId: getAnonymousId(),
      limit: String(limit)
    });

    return requestJson('/api/ritual/sessions?' + params.toString(), {
      method: 'GET'
    });
  }

  function getPatterns({ range = '30d' } = {}) {
    const params = new URLSearchParams({
      anonymousId: getAnonymousId(),
      range
    });

    return requestJson('/api/ritual/patterns?' + params.toString(), {
      method: 'GET'
    });
  }

  function deleteAllData() {
    return requestJson('/api/user/data', {
      method: 'DELETE',
      body: JSON.stringify({
        anonymousId: getAnonymousId()
      })
    });
  }

  function deleteSession(sessionId) {
    return requestJson('/api/ritual/sessions/' + encodeURIComponent(sessionId), {
      method: 'DELETE',
      body: JSON.stringify({
        anonymousId: getAnonymousId()
      })
    });
  }

  function submitFeedback(sessionId, feedback) {
    return requestJson('/api/ritual/sessions/' + encodeURIComponent(sessionId) + '/feedback', {
      method: 'POST',
      body: JSON.stringify({
        anonymousId: getAnonymousId(),
        ...feedback
      })
    });
  }

  window.XinhuRitualApi = {
    getAnonymousId,
    createInsight,
    getSessions,
    getPatterns,
    deleteAllData,
    deleteSession,
    submitFeedback
  };
})();
