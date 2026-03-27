import { useEffect, useRef, useState } from 'react';

function readStoredValue(storageKey, fallbackValue) {
  if (!storageKey || typeof window === 'undefined') return fallbackValue;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) return fallbackValue;
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

export function buildProjectTabStateKey(projectId, tabName, stateName) {
  return `codeatlas:project:${projectId}:tab:${tabName}:${stateName}`;
}

export function usePersistentState(storageKey, initialValue) {
  const resolvedInitialRef = useRef();
  const skipNextWriteRef = useRef(false);

  if (resolvedInitialRef.current === undefined) {
    resolvedInitialRef.current =
      typeof initialValue === 'function' ? initialValue() : initialValue;
  }

  const [state, setState] = useState(() =>
    readStoredValue(storageKey, resolvedInitialRef.current),
  );

  useEffect(() => {
    skipNextWriteRef.current = true;
    setState(readStoredValue(storageKey, resolvedInitialRef.current));
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;

    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      return;
    }

    try {
      if (state === undefined) {
        window.localStorage.removeItem(storageKey);
      } else {
        window.localStorage.setItem(storageKey, JSON.stringify(state));
      }
    } catch {
      // Ignore storage quota and serialization errors.
    }
  }, [storageKey, state]);

  return [state, setState];
}
