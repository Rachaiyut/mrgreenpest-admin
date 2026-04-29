import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Reads `?focus=<id>&action=<action>` from the URL (set by NotificationMenu)
 * and calls onMatch with the focusId. Same focus value won't re-fire back-to-
 * back, but a different focus value (e.g. another notification clicked while
 * staying on the same page) will fire.
 *
 * Pages should call this AFTER their primary data is loaded so the handler
 * has the record available.
 */
export const useNotificationFocus = (
  expectedAction: string,
  ready: boolean,
  onMatch: (focusId: string, extra: URLSearchParams) => void,
) => {
  const [params, setParams] = useSearchParams();
  const lastFiredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ready) return;

    const focus = params.get('focus');
    const action = params.get('action');
    if (!focus || action !== expectedAction) return;

    // Same focus value already fired — skip (e.g. caused by setParams clearing
    // and React Router immediately re-running the effect).
    if (lastFiredRef.current === focus) return;
    lastFiredRef.current = focus;

    onMatch(focus, params);

    // Strip the params so the URL is clean and back-navigation doesn't re-fire.
    const next = new URLSearchParams(params);
    next.delete('focus');
    next.delete('action');
    next.delete('category');
    setParams(next, { replace: true });

    // After a short delay, drop the dedup marker so the same notification
    // clicked again later (e.g. user cancelled and wants to retry) can re-fire.
    // Intentionally not cleaned up on effect re-run — we want this to fire
    // once the user has had time to act on the popup.
    window.setTimeout(() => {
      if (lastFiredRef.current === focus) {
        lastFiredRef.current = null;
      }
    }, 1000);
  }, [ready, params, expectedAction, onMatch, setParams]);
};
