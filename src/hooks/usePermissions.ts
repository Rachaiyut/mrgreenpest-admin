export const usePermissions = () => {
  const permissions: string[] = JSON.parse(localStorage.getItem('permissions') || '[]');
  const hasPermission = (perm: string) => permissions.includes(perm);
  return { permissions, hasPermission };
};
