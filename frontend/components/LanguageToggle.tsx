'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Languages } from 'lucide-react';

export const LanguageToggle = () => {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'es' : 'en';
    setLanguage(newLanguage);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2 text-sm font-medium hover:bg-white/10 transition-colors"
      style={{ color: '#164F5B' }}
    >
      <Languages className="w-4 h-4" />
      <span className="hidden sm:inline">
        {language === 'en' ? 'ES' : 'EN'}
      </span>
    </Button>
  );
};
