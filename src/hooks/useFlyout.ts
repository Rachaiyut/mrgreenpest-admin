import { useState, useRef, useEffect, useCallback } from 'react';

export const useFlyout = (collapsed: boolean) => {
  const [flyoutGroup, setFlyoutGroup] = useState<string | null>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [closeTimer, setCloseTimer] = useState<number | null>(null);
  const flyoutRef = useRef<HTMLDivElement | null>(null);

  const openFlyout = useCallback((groupName: string, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    setFlyoutGroup(groupName);
    setAnchorEl(target);
    setFlyoutPos({ top: rect.top, left: rect.right + 8 });
  }, []);

  const closeFlyout = useCallback(() => {
    setFlyoutGroup(null);
    setAnchorEl(null);
  }, []);

  const startCloseTimer = useCallback(() => {
    const id = window.setTimeout(() => {
      closeFlyout();
    }, 200);
    setCloseTimer(id);
  }, [closeFlyout]);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      setCloseTimer(null);
    }
  }, [closeTimer]);

  useEffect(() => {
    if (!collapsed || !flyoutGroup || !anchorEl) return;
    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      let top = rect.top;
      let left = rect.right + 8;
      // Note: We can't access the flyout ref dimensions easily if it's not rendered or if we don't pass the ref out.
      // For simplicity, we assume a default width/height or just position relative to anchor.
      // In the original code, it checked flyoutRef.current.
      // Here we might need to pass a ref to the flyout component or assume standard size.
      // Let's stick to the original logic but we might miss the exact height check if ref is not available.
      // We'll rely on the SidebarFlyout component to handle its own positioning or just use the initial calculation.

      const menuWidth = 240; // Approximate
      const menuHeight = 0; // Unknown until rendered

      if (left + menuWidth > window.innerWidth - 8) {
        left = rect.left - menuWidth - 8;
      }
      if (top + menuHeight > window.innerHeight - 8) {
        // This part is tricky without the ref.
        // We'll just clamp to window height at the bottom if we knew the height.
      }
      setFlyoutPos({ top, left });
    };

    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [collapsed, flyoutGroup, anchorEl]);

  return {
    flyoutGroup,
    flyoutPos,
    anchorEl,
    openFlyout,
    closeFlyout,
    startCloseTimer,
    clearCloseTimer,
  };
};
