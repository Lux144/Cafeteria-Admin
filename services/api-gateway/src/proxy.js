const { createLogger } = require('../../shared/logger');

const logger = createLogger('ApiGateway:Proxy');

function createReverseProxy(targetBaseUrl) {
  return async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || req.correlationId;
    const targetUrl = new URL(req.url, targetBaseUrl).toString();

    const headers = { ...req.headers };
    delete headers.host;
    delete headers['content-length'];

    // Inject authenticated user headers if available
    if (req.user) {
      headers['x-user-id'] = req.user.id || '';
      headers['x-user-role'] = req.user.role || '';
      headers['x-user-email'] = req.user.email || '';
      headers['x-user-name'] = encodeURIComponent(req.user.name || '');
    }

    headers['x-correlation-id'] = correlationId;

    const options = {
      method: req.method,
      headers
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      options.headers['content-type'] = 'application/json';
      options.body = JSON.stringify(req.body);
    }

    try {
      const response = await fetch(targetUrl, options);
      const contentType = response.headers.get('content-type') || '';

      res.status(response.status);

      if (contentType.includes('application/json')) {
        const data = await response.json();
        return res.json(data);
      } else {
        const text = await response.text();
        return res.send(text);
      }
    } catch (error) {
      logger.error(`Error de conexión hacia ${targetUrl}:`, {
        error: error.message,
        correlationId
      });

      return res.status(503).json({
        error: 'Servicio temporalmente no disponible',
        target: targetBaseUrl,
        details: error.message,
        correlationId
      });
    }
  };
}

module.exports = { createReverseProxy };
