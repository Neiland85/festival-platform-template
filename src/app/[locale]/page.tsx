'use client';

import { useTranslations } from 'next-intl';

export default function LocalePage() {
  const t = useTranslations('home');

  return (
    <main style={{ padding: 40 }}>
      <h1>{t('title')}</h1>
    </main>
  );
}
