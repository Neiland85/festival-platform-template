'use client';

import { useTranslations } from 'next-intl';

export default function Page() {
  const t = useTranslations('home');

  return (
    <div style={{ padding: 40 }}>
      <h1>{t('title')}</h1>
    </div>
  );
}
