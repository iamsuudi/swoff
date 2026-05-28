export function setupLogger(app) {
  app.use((req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();
    const originalEnd = res.end;
    res.end = function (...args) {
      const duration = Date.now() - start;
      const method = req.method.padEnd(6);
      const status = res.statusCode;
      const path = req.originalUrl || req.url;
      console.log(`[${timestamp}] ${method} ${path} ${status} ${duration}ms`);
      return originalEnd.apply(this, args);
    };
    next();
  });
}
