import React, { createContext, useContext, useEffect } from 'react';

/**
 * VisionEdge UDS locks the light theme, so there is no dark mode. The context stays so existing
 * callers (charts) keep working; isDark is always false.
 */
interface ThemeContextType {
  theme: 'light';
  isDark: false;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'light', isDark: false });

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    try {
      localStorage.removeItem('golinks_theme');
    } catch {
      // storage unavailable
    }
  }, []);
  return <ThemeContext.Provider value={{ theme: 'light', isDark: false }}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
