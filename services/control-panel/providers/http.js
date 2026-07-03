// Small fetch helper with a timeout that never throws for the caller to crash on.
// Returns parsed JSON or throws a tagged error the providers translate to "starting".
async function getJson(url, { timeoutMs = 4000, headers = {} } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers });
    if (!res.ok) {
      const e = new Error(`HTTP ${res.status} from ${url}`);
      e.code = 'BAD_STATUS';
      throw e;
    }
    return await res.json();
  } catch (err) {
    // Normalize timeout/connection errors so providers can report "starting".
    if (err.name === 'AbortError') err.code = 'TIMEOUT';
    if (!err.code) err.code = 'UNREACHABLE';
    throw err;
  } finally {
    clearTimeout(t);
  }
}

async function postJson(url, body, { timeoutMs = 6000, headers = {} } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const e = new Error(`HTTP ${res.status} from ${url}`);
      e.code = 'BAD_STATUS';
      throw e;
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') err.code = 'TIMEOUT';
    if (!err.code) err.code = 'UNREACHABLE';
    throw err;
  } finally {
    clearTimeout(t);
  }
}

module.exports = { getJson, postJson };
