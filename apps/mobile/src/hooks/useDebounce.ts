import { useEffect, useState } from 'react';

/** Değeri `delay` ms geciktirir — arama input'unu her tuşta filtrelememek için. */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
