import { useRef, useCallback, useEffect } from "react";

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  waitMs: number = 1000
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let lastCall = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCall >= waitMs) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}

export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  waitMs: number = 1000
): (...args: Parameters<T>) => void {
  const lastCallRef = useRef<number>(0);
  const callbackRef = useRef<T>(callback);

  // React 19 safe: update ref in effect rather than render body
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= waitMs) {
        lastCallRef.current = now;
        callbackRef.current(...args);
      }
    },
    [waitMs]
  );
}

