'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export type SchoolTheme = {
  schoolId: string | null;
  schoolName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  motto: string | null;
  isLoading: boolean;
};

const defaults: Omit<SchoolTheme, 'isLoading'> = { schoolId: null, schoolName: 'PNG-SMS', logoUrl: null, primaryColor: '#1E40AF', secondaryColor: '#FFFFFF', backgroundColor: '#F8FAFC', motto: null };
const ThemeContext = createContext<SchoolTheme>({ ...defaults, isLoading: false });
const safeColor = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

export function SchoolThemeProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const [theme, setTheme] = useState<SchoolTheme>({ ...defaults, isLoading: false });

  useEffect(() => {
    const schoolId = user?.schoolId;
    if (!schoolId || user?.role === 'super_admin') { setTheme({ ...defaults, isLoading: false }); return; }
    let active = true;
    setTheme((current) => ({ ...current, schoolId, isLoading: true }));
    api.get(`/schools/${schoolId}/branding`).then((response) => {
      if (!active) return;
      const branding = response.data.data;
      setTheme({ schoolId, schoolName: branding.schoolName || defaults.schoolName, logoUrl: branding.logoUrl || null, primaryColor: safeColor(branding.primaryColor, defaults.primaryColor), secondaryColor: safeColor(branding.secondaryColor, defaults.secondaryColor), backgroundColor: safeColor(branding.backgroundColor, defaults.backgroundColor), motto: branding.motto || null, isLoading: false });
    }).catch(() => { if (active) setTheme({ ...defaults, schoolId, isLoading: false }); });
    return () => { active = false; };
  }, [user?.role, user?.schoolId]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--school-primary', theme.primaryColor);
    root.style.setProperty('--school-secondary', theme.secondaryColor);
    root.style.setProperty('--school-background', theme.backgroundColor);
  }, [theme.primaryColor, theme.secondaryColor, theme.backgroundColor]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useSchoolTheme = () => useContext(ThemeContext);
