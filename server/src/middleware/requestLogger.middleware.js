import { logger } from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const finishedAt = process.hrtime.bigint();
    const durationMs = Number(finishedAt - startedAt) / 1e6;
    const url = req.originalUrl || req.url;
    const contentLength = res.getHeader('content-length') ?? '-';

    logger.http(req.method, url, res.statusCode, durationMs, contentLength);
  });

  next();
}
