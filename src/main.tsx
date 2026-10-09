// Ensure global Buffer is safely polyfilled in browser environments
if (typeof window !== 'undefined' && !(window as any).Buffer) {
  (window as any).Buffer = {
    isBuffer: (obj: any) => Boolean(obj && obj._isBuffer),
    from: (val: any, enc?: string) => {
      const s = typeof val === 'string' ? val : String(val ?? '');
      return {
        _isBuffer: true,
        toString: (encoding?: string) => {
          if (encoding === 'hex') {
            let hex = '';
            for (let i = 0; i < s.length; i++) {
              hex += s.charCodeAt(i).toString(16).padStart(2, '0');
            }
            return hex;
          }
          if (encoding === 'base64') {
            try {
              return btoa(s);
            } catch {
              return s;
            }
          }
          return s;
        },
      };
    },
    alloc: (size: number) => new Uint8Array(size),
  };
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
