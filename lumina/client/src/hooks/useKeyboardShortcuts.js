import { useEffect } from 'react';

export default function useKeyboardShortcuts() {
  useEffect(() => {
    function handler(e) {
      const tag = e.target.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;

      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('shortcut:close'));
        return;
      }

      if (e.key === '?' && !isInput) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('shortcut:help'));
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('shortcut:search'));
        return;
      }

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('shortcut:search'));
        return;
      }

      if (e.key === 'n' && !isInput) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('shortcut:newpost'));
        return;
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
