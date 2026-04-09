function padTwo(value) {
  return String(value).padStart(2, '0');
}

function formatTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = padTwo(date.getMonth() + 1);
  const day = padTwo(date.getDate());
  const hours = padTwo(date.getHours());
  const minutes = padTwo(date.getMinutes());
  const seconds = padTwo(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function normalizeMessage(message) {
  return String(message ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMeta(meta) {
  if (typeof meta === 'undefined' || meta === null) {
    return '';
  }

  if (meta instanceof Error) {
    return ` ${meta.message}`;
  }

  if (typeof meta === 'string') {
    return ` ${meta}`;
  }

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ` ${String(meta)}`;
  }
}

function write(level, message, meta) {
  const line = `${formatTimestamp()} ${level}: ${normalizeMessage(message)}${normalizeMeta(meta)}`;

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

function formatDurationMs(durationMs) {
  const value = Number(durationMs);
  if (!Number.isFinite(value)) {
    return '0.000';
  }
  return value.toFixed(3);
}

export const logger = {
  info(message, meta) {
    write('info', message, meta);
  },

  warn(message, meta) {
    write('warn', message, meta);
  },

  error(message, meta) {
    write('error', message, meta);
  },

  http(method, url, statusCode, durationMs, contentLength) {
    const size =
      typeof contentLength === 'undefined' || contentLength === null
        ? '-'
        : contentLength;

    write(
      'http',
      `${method} ${url} ${statusCode} ${formatDurationMs(durationMs)} ms - ${size}`,
    );
  },
};
