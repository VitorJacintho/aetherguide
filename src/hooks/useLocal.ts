import { useEffect, useState } from 'react';

/** useState que persiste no localStorage. */
export function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`aetherguide.${key}`);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(`aetherguide.${key}`, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}
