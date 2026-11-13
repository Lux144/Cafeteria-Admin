// Structured logging with correlation IDs and timestamps
function createLogger(serviceName = 'service') {
  function format(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const correlationId = meta.correlationId || '-';
    const metaStr = Object.keys(meta).length > 0 && !(Object.keys(meta).length === 1 && meta.correlationId)
      ? ' ' + JSON.stringify(meta)
      : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${serviceName}] [cid:${correlationId}] ${message}${metaStr}`;
  }

  return {
    info(message, meta) {
      console.log(format('info', message, meta));
    },
    warn(message, meta) {
      console.warn(format('warn', message, meta));
    },
    error(message, meta) {
      console.error(format('error', message, meta));
    },
    debug(message, meta) {
      if (process.env.DEBUG) {
        console.log(format('debug', message, meta));
      }
    }
  };
}

module.exports = { createLogger };
