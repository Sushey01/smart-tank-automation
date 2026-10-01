import { createContext, useContext } from 'react';

export interface ToastContextValue {
  push: (message: string, tone?: 'ok' | 'danger') => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}
