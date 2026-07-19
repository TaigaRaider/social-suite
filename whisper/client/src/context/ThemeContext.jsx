import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const darkVars = {
  '--bg-primary': '#0f172a',
  '--bg-secondary': '#1e293b',
  '--bg-tertiary': '#334155',
  '--text-primary': '#f1f5f9',
  '--text-secondary': '#94a3b8',
  '--text-tertiary': '#64748b',
  '--border': '#475569',
  '--accent': '#d97706',
  '--hover-bg': 'rgba(255, 255, 255, 0.03)',
  '--page-header-bg': 'rgba(15, 23, 42, 0.85)',
};

const lightVars = {
  '--bg-primary': '#f8fafc',
  '--bg-secondary': '#ffffff',
  '--bg-tertiary': '#f1f5f9',
  '--text-primary': '#0f172a',
  '--text-secondary': '#64748b',
  '--text-tertiary': '#94a3b8',
  '--border': '#e2e8f0',
  '--accent': '#d97706',
  '--hover-bg': 'rgba(0, 0, 0, 0.03)',
  '--page-header-bg': 'rgba(248, 250, 252, 0.85)',
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('whisper_theme') || 'dark');

  useEffect(() => {
    const root = document.documentElement;
    const vars = theme === 'dark' ? darkVars : lightVars;
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
    localStorage.setItem('whisper_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
