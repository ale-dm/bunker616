import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';

let serverDown = false;
const listeners = new Set<(down: boolean) => void>();

function setServerDown(value: boolean) {
  if (serverDown === value) {
    return;
  }
  serverDown = value;
  listeners.forEach(listener => listener(value));
}

// Un error sin respuesta del servidor es un fallo de red, no un error de la API.
export function reportQueryResult(error: unknown | null) {
  if (error === null) {
    setServerDown(false);
    return;
  }
  if (isAxiosError(error) && !error.response) {
    setServerDown(true);
  }
}

export function useServerDown(): boolean {
  const [down, setDown] = useState(serverDown);
  useEffect(() => {
    listeners.add(setDown);
    return () => {
      listeners.delete(setDown);
    };
  }, []);
  return down;
}
