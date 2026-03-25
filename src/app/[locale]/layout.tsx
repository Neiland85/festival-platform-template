import { notFound } from 'next/navigation';
import IntlProvider from '@/i18n/provider';
import { locales } from '@/i18n/config';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as any)) {
    notFound();
  }

  let messages;

  try {
    messages = (await import(`@/messages/${locale}.json`)).default;
  } catch (e) {
    console.error('Missing messages for locale:', locale);
    notFound();
  }

  return (
    <html lang={locale}>
      <body>
        <IntlProvider locale={locale} messages={messages}>
          {children}
        </IntlProvider>
      </body>
    </html>
  );
}
