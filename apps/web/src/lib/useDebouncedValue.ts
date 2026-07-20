import { useEffect, useState } from 'react';

/**
 * Bir değeri belirtilen gecikmeyle geciktirir (debounce). Arama kutusunda her
 * tuş vuruşunda istek atmamak için kullanılır: kullanıcı yazmayı bıraktıktan
 * `delay` ms sonra döndürülen değer güncellenir (bkz. ProductsPage arama akışı).
 */
export function useDebouncedValue<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
