'use client'

import { LanguageSwitcher, LanguageToggle } from '@/components/ui/LanguageSwitcher'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'

export function LanguageSwitcherDemo() {
  const { t, language } = useLanguage()

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">{t('language.switch')}</h1>
        <p className="text-slate-600">{t('language.current', { language: language === 'es' ? 'Español' : 'English' })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Default Variant */}
        <Card>
          <CardHeader>
            <CardTitle>Default Variant</CardTitle>
            <CardDescription>Full dropdown with language names and flags</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSwitcher variant="default" />
          </CardContent>
        </Card>

        {/* Compact Variant */}
        <Card>
          <CardHeader>
            <CardTitle>Compact Variant</CardTitle>
            <CardDescription>Simple toggle button with current language</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSwitcher variant="compact" />
          </CardContent>
        </Card>

        {/* Minimal Variant */}
        <Card>
          <CardHeader>
            <CardTitle>Minimal Variant</CardTitle>
            <CardDescription>Side-by-side language buttons</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSwitcher variant="minimal" />
          </CardContent>
        </Card>

        {/* Toggle Variant */}
        <Card>
          <CardHeader>
            <CardTitle>Toggle Variant</CardTitle>
            <CardDescription>Simple ES/EN toggle for headers</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageToggle />
          </CardContent>
        </Card>

        {/* No Label Variant */}
        <Card>
          <CardHeader>
            <CardTitle>No Label Variant</CardTitle>
            <CardDescription>Default dropdown without text labels</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSwitcher variant="default" showLabel={false} />
          </CardContent>
        </Card>

        {/* Custom Styled */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Styled</CardTitle>
            <CardDescription>Compact variant with custom styling</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSwitcher 
              variant="compact" 
              className="bg-primary text-primary-foreground hover:bg-primary/90" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Translation Examples */}
      <Card>
        <CardHeader>
          <CardTitle>{t('common.success')}</CardTitle>
          <CardDescription>Translation examples in current language</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>{t('auth.login')}:</strong> {t('login.title')}
            </div>
            <div>
              <strong>{t('auth.register')}:</strong> {t('register.title')}
            </div>
            <div>
              <strong>{t('common.loading')}:</strong> {t('home.loadingApp')}
            </div>
            <div>
              <strong>{t('features.secure')}:</strong> {t('features.intelligent')}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 