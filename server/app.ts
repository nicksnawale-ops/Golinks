import fs from 'node:fs';
import path from 'node:path';
import express, { NextFunction, Request, Response } from 'express';
import { actorMiddleware } from './auth';
import { ServerConfig } from './config';
import { DB } from './db/database';
import { HttpError } from './errors';
import { apiRouter } from './routes/api';
import { redirectRouter } from './routes/redirect';

export function createApp(db: DB, config: ServerConfig) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  if (config.logRequests) {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const location = res.statusCode === 302 ? ` -> ${res.getHeader('location')}` : '';
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms${location}`);
      });
      next();
    });
  }

  app.use((_req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer-when-downgrade');
    res.set('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  // Identity from the session cookie, for both the API and go-link redirects (private links).
  app.use(actorMiddleware(db));

  // 1. REST API
  app.use('/api', apiRouter(db, config));

  // 2. Built static assets (hashed filenames → long cache). Missing /assets/* files are a plain 404.
  const indexPath = path.join(config.staticDir, 'index.html');
  app.use(
    '/assets',
    express.static(path.join(config.staticDir, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false })
  );
  app.use(express.static(config.staticDir, { index: false, maxAge: '1h' }));

  // 3. Go-link redirects (302) — before the SPA is served.
  app.use(redirectRouter(db));

  // 4. SPA fallback: dashboard, app page routes, "Link not found" and "disabled" pages.
  app.get('*', (_req, res) => {
    const status = (res.locals.spaStatus as number | undefined) ?? 200;
    if (!fs.existsSync(indexPath)) {
      return res
        .status(status === 200 ? 503 : status)
        .type('text/plain')
        .send(
          status === 200
            ? 'Frontend not built. Run "npm run build" (or use the Vite dev server on :3000).'
            : 'Go link not found.'
        );
    }
    res.status(status).set('Cache-Control', 'no-cache').sendFile(indexPath);
  });

  // Errors → JSON for the API, plain text elsewhere.
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const parseError = (err as { type?: string })?.type === 'entity.parse.failed';
    const status = err instanceof HttpError ? err.status : parseError ? 400 : ((err as { status?: number })?.status ?? 500);
    const message =
      err instanceof HttpError ? err.message : parseError ? 'Malformed JSON body.' : status === 404 ? 'Not found' : 'Internal server error';
    if (status >= 500) console.error(err);
    if (req.path.startsWith('/api')) {
      res.status(status).json({ error: message, ...(err instanceof HttpError && err.details ? { details: err.details } : {}) });
    } else {
      res.status(status).type('text/plain').send(message);
    }
  });

  return app;
}
