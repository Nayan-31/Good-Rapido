import { IncomingMessage, ServerResponse } from 'http';
import { Duplex } from 'stream';

class MockSocket extends Duplex {
    constructor() {
        super();
        this.writes = [];
        this.remoteAddress = '127.0.0.1';
        this.encrypted = false;
    }

    _read() { }

    _write(chunk, encoding, callback) {
        this.writes.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
        callback();
    }

    setTimeout() {
        return this;
    }

    setNoDelay() {
        return this;
    }

    setKeepAlive() {
        return this;
    }
}

export const injectRequest = (app, { method = 'GET', path = '/', headers = {}, body } = {}) => {
    return new Promise((resolve, reject) => {
        const bodyBuffer = createBodyBuffer(body);
        const normalizedHeaders = normalizeHeaders({
            ...headers,
            ...(bodyBuffer.length ? {
                'content-type': headers['content-type'] || 'application/json',
                'content-length': String(bodyBuffer.length)
            } : {})
        });
        const socket = new MockSocket();
        const req = new IncomingMessage(socket);
        const res = new ServerResponse(req);
        const responseChunks = [];
        let isResolved = false;

        req.method = method;
        req.url = path;
        req.headers = normalizedHeaders;
        req.rawHeaders = toRawHeaders(normalizedHeaders);
        req.socket = socket;
        req.connection = socket;

        res.assignSocket(socket);
        captureResponseBody(res, responseChunks, () => {
            if (isResolved) {
                return;
            }

            isResolved = true;
            resolve(buildResponse(res, responseChunks));
        });

        req.on('error', reject);
        res.on('error', reject);
        socket.on('error', reject);

        app.handle(req, res);

        if (bodyBuffer.length) {
            req.push(bodyBuffer);
        }

        req.push(null);
    });
};

const captureResponseBody = (res, responseChunks, onEnd) => {
    const write = res.write.bind(res);
    const end = res.end.bind(res);

    res.write = (chunk, encoding, callback) => {
        pushChunk(responseChunks, chunk, encoding);
        return write(chunk, encoding, callback);
    };

    res.end = (chunk, encoding, callback) => {
        pushChunk(responseChunks, chunk, encoding);
        const result = end(chunk, encoding, callback);

        queueMicrotask(onEnd);

        return result;
    };
};

const buildResponse = (res, responseChunks) => {
    const bodyText = Buffer.concat(responseChunks).toString('utf8');

    return {
        statusCode: res.statusCode,
        headers: res.getHeaders(),
        text: bodyText,
        body: parseJson(bodyText)
    };
};

const pushChunk = (responseChunks, chunk, encoding) => {
    if (!chunk) {
        return;
    }

    responseChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
};

const createBodyBuffer = (body) => {
    if (body === undefined || body === null) {
        return Buffer.alloc(0);
    }

    if (Buffer.isBuffer(body)) {
        return body;
    }

    if (typeof body === 'string') {
        return Buffer.from(body);
    }

    return Buffer.from(JSON.stringify(body));
};

const normalizeHeaders = (headers) => {
    return Object.entries(headers).reduce((normalized, [name, value]) => {
        normalized[name.toLowerCase()] = value;
        return normalized;
    }, {});
};

const toRawHeaders = (headers) => {
    return Object.entries(headers).flatMap(([name, value]) => [name, value]);
};

const parseJson = (text) => {
    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch (_err) {
        return null;
    }
};
