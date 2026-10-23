/**
 * Server-side go-link redirects: GET /:shortName and GET /:shortName/* answer with HTTP 302
 * before the React app is ever served. Anything that is not a resolvable go link falls through
 * to the SPA handler (which renders "Link not found" / "This link has been disabled").
 */
import { Router } from 'express';
import { isReservedShortName } from '../../shared/resolver';
import { DB } from '../db/database';
import { resolveGoLink } from '../services/linkService';

/** First path segment of the go-link candidate, with a leading "go/" alias removed. */
function firstSegment(path: string): string {
  return path.replace(/^go\//i, '').split(/[/?#]/)[0].toLowerCase();
}

export function redirectRouter(db: DB): Router {
  const router = Router();

  router.get(['/:shortName', '/:shortName/*'], (req, res, next) => {
    // Raw, still-encoded path + query, e.g. "jira/PROJ-123?view=full" — passed through untouched.
    const raw = req.originalUrl.replace(/^\/+/, '');
    const segment = firstSegment(raw);

    // /api, /assets, app page routes (dashboard, directory, ...) and files (favicon.ico) are never go links.
    if (!segment || segment.includes('.') || isReservedShortName(segment)) return next();

    const result = resolveGoLink(db, raw, { recordClick: req.method === 'GET' });

    if (result.found) {
      res.set('Cache-Control', 'private, no-store');
      return res.redirect(302, result.resolvedUrl);
    }

    res.locals.spaStatus = result.isDisabled ? 410 : 404;
    next();
  });

  return router;
}
