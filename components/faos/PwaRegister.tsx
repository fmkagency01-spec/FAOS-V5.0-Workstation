'use client';

import { useEffect } from 'react';

/** Registers the FAOS service worker for Add to Home Screen / Install App. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_ENABLE_SW) {
      // Avoid SW cache fighting Next HMR in local dev unless explicitly enabled
      return;
    }

    const onLoad = () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        /* ignore registration failures (private mode, etc.) */
      });
    };

    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
