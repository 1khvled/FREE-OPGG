/**
 * Authenticated League Client Update (LCU) HTTPS client.
 *
 * The client speaks to `https://127.0.0.1:<port><path>` and authenticates with
 * `Authorization: Basic base64("riot:" + token)`, using the token found in the
 * client's `lockfile`. Riot serves a self-signed certificate on that port, so
 * `rejectUnauthorized` is disabled for this agent only.
 *
 * Node's `https` module is used directly — no extra dependency.
 */

'use strict';

const https = require('https');

/** Loopback agent that accepts Riot's self-signed certificate. */
const AGENT = new https.Agent({ keepAlive: false, rejectUnauthorized: false });

/** Default request timeout (ms). */
const DEFAULT_TIMEOUT = 4000;

class LcuClient {
  /**
   * @param {object} [options]
   * @param {string} [options.host]
   * @param {number} [options.timeout]
   */
  constructor(options = {}) {
    this.host = options.host || '127.0.0.1';
    this.timeout = Number.isFinite(options.timeout) ? options.timeout : DEFAULT_TIMEOUT;
    this.port = null;
    this.token = null;
  }

  /** @returns {boolean} true when credentials are available. */
  get connected() {
    return Boolean(this.port && this.token);
  }

  /**
   * Store credentials discovered from the lockfile.
   *
   * @param {{port:number,token:string}|null} creds
   */
  setCredentials(creds) {
    if (!creds || !creds.port || !creds.token) {
      this.port = null;
      this.token = null;
      return;
    }
    this.port = Number(creds.port);
    this.token = String(creds.token);
  }

  /** Forget the credentials. */
  clear() {
    this.port = null;
    this.token = null;
  }

  /** @returns {string} the `Authorization` header value. */
  authorization() {
    return `Basic ${Buffer.from(`riot:${this.token}`).toString('base64')}`;
  }

  /**
   * Perform an LCU request.
   *
   * @param {string} method - HTTP verb
   * @param {string} endpoint - path beginning with `/`
   * @param {*} [body] - JSON-serialisable request body
   * @returns {Promise<*>} the parsed response body (`null` for empty bodies)
   * @throws {Error} when the client is not connected or the status is >= 400
   */
  request(method, endpoint, body = undefined) {
    if (!this.connected) {
      return Promise.reject(new Error('League client is not connected'));
    }
    const verb = String(method || 'GET').toUpperCase();
    const target = String(endpoint || '/');
    const path = target.startsWith('/') ? target : `/${target}`;

    let payload = null;
    if (body !== undefined && body !== null && verb !== 'GET' && verb !== 'HEAD') {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const headers = {
      Authorization: this.authorization(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Content-Length': payload ? Buffer.byteLength(payload) : 0,
    };

    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (err) => {
        if (settled) return;
        settled = true;
        reject(err);
      };

      let request;
      try {
        request = https.request(
          {
            hostname: this.host,
            port: this.port,
            path,
            method: verb,
            agent: AGENT,
            headers,
            timeout: this.timeout,
          },
          (res) => {
            let raw = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { raw += chunk; });
            res.on('end', () => {
              if (settled) return;
              settled = true;
              const status = res.statusCode || 0;
              let data = null;
              if (raw) {
                try {
                  data = JSON.parse(raw);
                } catch (err) {
                  data = raw;
                }
              }
              if (status >= 400) {
                const detail = data && typeof data === 'object' && data.message
                  ? `: ${data.message}`
                  : '';
                const error = new Error(`LCU ${status} ${verb} ${path}${detail}`);
                error.status = status;
                error.data = data;
                reject(error);
                return;
              }
              resolve(data);
            });
          },
        );
      } catch (err) {
        fail(err);
        return;
      }

      request.on('error', (err) => fail(err));
      request.on('timeout', () => {
        request.destroy();
        fail(new Error(`LCU timeout after ${this.timeout}ms (${verb} ${path})`));
      });

      if (payload) request.write(payload);
      request.end();
    });
  }

  /** GET helper. */
  get(endpoint) {
    return this.request('GET', endpoint);
  }

  /** POST helper. */
  post(endpoint, body) {
    return this.request('POST', endpoint, body === undefined ? {} : body);
  }

  /** PUT helper. */
  put(endpoint, body) {
    return this.request('PUT', endpoint, body === undefined ? {} : body);
  }

  /** PATCH helper. */
  patch(endpoint, body) {
    return this.request('PATCH', endpoint, body === undefined ? {} : body);
  }

  /** DELETE helper. */
  delete(endpoint, body) {
    return this.request('DELETE', endpoint, body);
  }
}

module.exports = { LcuClient, AGENT };
