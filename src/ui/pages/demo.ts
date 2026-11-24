// Development only: with ?demo in the URL the drills answer by themselves
// (the second option), so headless screenshots can show the verdict.

import { useEffect } from 'react';

const DEMO = import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo');

export function useDemoAnswer(ready: boolean, act: (i: number) => void): void {
  useEffect(() => {
    if (!DEMO || !ready) return;
    const id = window.setTimeout(() => act(1), 400);
    return () => window.clearTimeout(id);
  }, [ready, act]);
}
