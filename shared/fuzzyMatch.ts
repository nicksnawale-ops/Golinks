import { GoLink } from './types/link';

/**
 * Computes Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Finds similar links using fuzzy distance, substring matching, and tag matching.
 */
export function findSimilarLinks(query: string, allLinks: GoLink[], maxResults = 4): GoLink[] {
  const cleanQuery = query.toLowerCase().trim().replace(/^go\//, '');
  if (!cleanQuery) return allLinks.slice(0, maxResults);

  const scored = allLinks.map((link) => {
    const name = link.shortName.toLowerCase();
    const desc = (link.description || '').toLowerCase();
    const cat = link.category.toLowerCase();
    const tags = (link.tags || []).join(' ').toLowerCase();

    let score = 0;

    // Exact or direct prefix match
    if (name === cleanQuery) {
      score += 100;
    } else if (name.startsWith(cleanQuery) || cleanQuery.startsWith(name)) {
      score += 60;
    } else if (name.includes(cleanQuery) || cleanQuery.includes(name)) {
      score += 40;
    }

    // Levenshtein similarity on shortName
    const distance = levenshteinDistance(cleanQuery, name);
    const maxLen = Math.max(cleanQuery.length, name.length);
    const similarity = maxLen > 0 ? (1 - distance / maxLen) : 0;
    score += similarity * 50;

    // Word boundary or tag match
    if (tags.includes(cleanQuery)) {
      score += 25;
    }
    if (desc.includes(cleanQuery)) {
      score += 20;
    }
    if (cat.includes(cleanQuery)) {
      score += 15;
    }

    // Popularity bias (subtle tiebreaker)
    score += Math.min(link.clickCount / 100, 10);

    return { link, score };
  });

  // Sort descending by score, filter out low relevance
  scored.sort((a, b) => b.score - a.score);

  return scored
    .filter((item) => item.score > 15)
    .slice(0, maxResults)
    .map((item) => item.link);
}
