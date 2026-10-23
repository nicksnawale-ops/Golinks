import { GoLink } from '../types/link';

export type LinkHealthStatus = 'healthy' | 'stale' | 'disabled';

export interface LinkHealthInfo {
  status: LinkHealthStatus;
  isStale: boolean;
  daysSinceAccess: number | null;
  label: string;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Calculates link health:
 * - Flags links not accessed in 90+ days as "stale"
 * - Inactive links as "disabled"
 * - Active accessed links as "healthy"
 */
export function getLinkHealth(link: GoLink): LinkHealthInfo {
  if (!link.isActive) {
    return {
      status: 'disabled',
      isStale: false,
      daysSinceAccess: null,
      label: 'Disabled',
    };
  }

  const now = Date.now();
  const lastTime = link.lastAccessedAt
    ? new Date(link.lastAccessedAt).getTime()
    : new Date(link.createdAt).getTime();

  const diffMs = now - lastTime;
  const daysSinceAccess = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMs >= NINETY_DAYS_MS) {
    return {
      status: 'stale',
      isStale: true,
      daysSinceAccess,
      label: `Stale (${daysSinceAccess}d inactive)`,
    };
  }

  return {
    status: 'healthy',
    isStale: false,
    daysSinceAccess,
    label: 'Healthy',
  };
}
