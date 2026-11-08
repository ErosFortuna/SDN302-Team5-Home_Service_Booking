const http = require('node:http');
const stream = require('node:stream');

/**
 * Shared in-memory HTTP dispatch helper for Express route tests.
 * Dispatches requests directly through `app.handle(req, res)` without opening
 * a network socket.
 *
 * @param {import('express').Express} app
 * @param {{
 *   method?: string,
 *   url: string,
 *   headers?: Record<string, string>,
 *   body?: string | Record<string, unknown>
 * }} options
 * @returns {Promise<{ status: number, statusCode: number, body: any, headers: Record<string, any>, json: () => Promise<any> }>}
 */
function dispatch(app, options = {}) {
  const {
    method = 'GET',
    url,
    headers = {},
    body,
    remoteAddress = '127.0.0.1',
    ip,
  } = options;
  return new Promise((resolve, reject) => {
    const chunks = [];
    const socket = new stream.Duplex({
      read() {},
      write(chunk, encoding, callback) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding));
        callback();
      },
    });

    const normalizedHeaders = { host: '127.0.0.1' };
    for (const [k, v] of Object.entries(headers)) {
      if (v !== undefined) {
        normalizedHeaders[k.toLowerCase()] = String(v);
      }
    }

    let parsedInputBody = undefined;
    let bodyBuffer = null;
    if (body !== undefined && body !== null) {
      if (Buffer.isBuffer(body)) {
        bodyBuffer = body;
      } else if (typeof body === 'string') {
        bodyBuffer = Buffer.from(body, 'utf8');
        try {
          parsedInputBody = JSON.parse(body);
        } catch {
          parsedInputBody = body;
        }
      } else {
        parsedInputBody = body;
        bodyBuffer = Buffer.from(JSON.stringify(body), 'utf8');
      }
      if (!normalizedHeaders['content-type']) {
        normalizedHeaders['content-type'] = 'application/json';
      }
      normalizedHeaders['content-length'] = String(bodyBuffer.byteLength);
    }

    const req = new http.IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = url;
    req.headers = normalizedHeaders;
    req.connection = { remoteAddress, encrypted: false };
    req.socket = req.connection;
    if (ip !== undefined) {
      req.ip = ip;
    }

    if (parsedInputBody !== undefined) {
      req.body = parsedInputBody;
      req._body = true;
    }
    req.complete = true;
    if (bodyBuffer) {
      req.push(bodyBuffer);
    }
    req.push(null);

    const res = new http.ServerResponse(req);
    res.assignSocket(socket);

    res.on('error', reject);
    res.on('finish', () => {
      const rawOutput = Buffer.concat(chunks).toString('utf8');
      const headerEnd = rawOutput.indexOf('\r\n\r\n');
      const bodyText = headerEnd !== -1 ? rawOutput.slice(headerEnd + 4) : rawOutput;
      let parsedBody;
      try {
        parsedBody = JSON.parse(bodyText);
      } catch {
        parsedBody = bodyText;
      }
      resolve({
        status: res.statusCode,
        statusCode: res.statusCode,
        body: parsedBody,
        headers: res.getHeaders(),
        json: async () => parsedBody,
      });
    });

    app.handle(req, res);
  });
}

module.exports = { dispatch };
