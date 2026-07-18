import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const darkVars = {
  '--bg-primary': '#181818',
  '--bg-secondary': '#262626',
  '--bg-tertiary': '#363636',
  '--text-primary': '#f5f5f5',
  '--text-secondary': '#a0a0a0',
  '--text-tertiary': '#666666',
  '--border': '#363636',
  '--accent': '#f5f5f5',
  '--hover-bg': 'rgba(255, 255, 255, 0.03)',
  '--page-header-bg': 'rgba(24, 24, 24, 0.85)',
};

const lightVars = {
  '--bg-primary': '#ffffff',
  '--bg-secondary': '#f5f5f5',
  '--bg-tertiary': '#e5e5e5',
  '--text-primary': '#181818',
  '--text-secondary': '#555555',
  '--text-tertiary': '#999999',
  '--border': '#e0e0e0',
  '--accent': '#181818',
  '--hover-bg': 'rgba(0, 0, 0, 0.03)',
  '--page-header-bg': 'rgba(255, 255, 255, 0.85)',
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
