import { useEffect, useState } from 'react';

/** Debounced search input — `query` updates immediately for the text field, `debouncedQuery` is what should trigger a refetch. */
export function useDriverSearch(delayMs = 350) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), delayMs);
    return () => clearTimeout(timer);
  }, [query, delayMs]);

  return { query, debouncedQuery, setQuery };
}
