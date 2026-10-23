import { useCallback, useEffect, useState } from 'react';
import {
  bulkImportLinks,
  createLink,
  deleteLink,
  getCategories,
  getLinks,
  resetToDefaults,
  updateLink,
} from '../services/linkService';
import { CreateLinkInput, GoLink, LinkVisibility, SortField, SortOrder, UpdateLinkInput } from '../types/link';

export interface FilterOptions {
  query: string;
  category: string;
  visibility: string;
  sortBy: SortField;
  sortOrder: SortOrder;
  status: 'all' | 'active' | 'inactive';
}

export function useGoLinks() {
  const [links, setLinks] = useState<GoLink[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    query: '',
    category: 'All',
    visibility: 'all',
    sortBy: 'clicks',
    sortOrder: 'desc',
    status: 'all',
  });

  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const activeParam =
        filters.status === 'active' ? true : filters.status === 'inactive' ? false : undefined;

      const [data, cats] = await Promise.all([
        getLinks({
          query: filters.query,
          category: filters.category,
          visibility: filters.visibility,
          isActive: activeParam,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        }),
        getCategories(),
      ]);

      setLinks(data);
      setCategories(cats);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load links';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const setFilterValue = <K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async (input: CreateLinkInput): Promise<GoLink> => {
    const created = await createLink(input);
    await fetchLinks();
    return created;
  };

  const handleUpdate = async (id: string, input: UpdateLinkInput): Promise<GoLink> => {
    const updated = await updateLink(id, input);
    await fetchLinks();
    return updated;
  };

  const handleDelete = async (id: string): Promise<boolean> => {
    const success = await deleteLink(id);
    if (success) {
      await fetchLinks();
    }
    return success;
  };

  const handleToggleActive = async (id: string, currentState: boolean): Promise<GoLink> => {
    const updated = await updateLink(id, { isActive: !currentState });
    await fetchLinks();
    return updated;
  };

  const handleResetToSeeds = async (): Promise<void> => {
    await resetToDefaults();
    await fetchLinks();
  };

  const handleBulkImport = async (
    rows: Array<{
      shortName: string;
      targetUrl: string;
      description: string;
      category: string;
    }>
  ): Promise<number> => {
    const count = await bulkImportLinks(rows);
    await fetchLinks();
    return count;
  };

  return {
    links,
    categories,
    loading,
    error,
    filters,
    setFilterValue,
    setFilters,
    refresh: fetchLinks,
    create: handleCreate,
    update: handleUpdate,
    remove: handleDelete,
    toggleActive: handleToggleActive,
    resetSeeds: handleResetToSeeds,
    bulkImport: handleBulkImport,
  };
}
