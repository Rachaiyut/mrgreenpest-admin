import { useEffect, useReducer } from 'react';

const readFromStorage = (): string[] => {
  const raw =
    typeof window !== 'undefined'
      ? localStorage.getItem('permissions')
      : null;
  if (!raw || raw === 'undefined') return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const usePermissions = () => {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const handler = () => forceUpdate();
    window.addEventListener('permissions-updated', handler);
    return () => window.removeEventListener('permissions-updated', handler);
  }, []);

  const permissions = readFromStorage();
  const hasPermission = (perm: string) => permissions.includes(perm);
  return { permissions, hasPermission };
};
