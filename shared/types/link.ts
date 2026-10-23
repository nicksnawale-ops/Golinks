export type LinkVisibility = 'public' | 'private';

export interface GoLink {
  id: string;
  shortName: string; // unique, lowercase, a-z 0-9 - _ /, 2-50 chars
  targetUrl: string; // valid http/https URL
  description?: string;
  category: string; // e.g. HR, IT, Finance, Engineering, General
  owner: string; // name or email
  visibility: LinkVisibility;
  isActive: boolean;
  clickCount: number;
  lastAccessedAt: string | null; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  tags?: string[];
}

export interface CreateLinkInput {
  shortName: string;
  targetUrl: string;
  description?: string;
  category: string;
  owner: string;
  visibility: LinkVisibility;
  isActive?: boolean;
  tags?: string[];
}

export interface UpdateLinkInput {
  shortName?: string;
  targetUrl?: string;
  description?: string;
  category?: string;
  owner?: string;
  visibility?: LinkVisibility;
  isActive?: boolean;
  tags?: string[];
}

export interface ResolveResultSuccess {
  found: true;
  isDisabled?: false;
  link: GoLink;
  resolvedUrl: string;
  isParameterMatch: boolean;
  suffix?: string;
  matchedPrefix?: string;
}

export interface ResolveResultDisabled {
  found: false;
  isDisabled: true;
  link: GoLink;
  owner: string;
  attempted: string;
  suggestions: GoLink[];
  inactiveLink?: GoLink;
}

export interface ResolveResultNotFound {
  found: false;
  isDisabled?: false;
  attempted: string;
  suggestions: GoLink[];
  inactiveLink?: GoLink;
}

export type ResolveResult = ResolveResultSuccess | ResolveResultDisabled | ResolveResultNotFound;

export type ViewMode = 'table' | 'cards';

export type SortField = 'clicks' | 'recent' | 'name' | 'lastAccessed';
export type SortOrder = 'asc' | 'desc';
