import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-context';
import { AppInitializer } from '@/components/layout/app-initializer';
import { I18nProvider } from '@/context/i18n-context';
import { AppDataProvider } from '@/context/app-data-context';

export const metadata: Metadata = {
  title: 'JCW FLOWERS',
  description: 'Complete invoicing system for florists',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <I18nProvider>
            <AppDataProvider>
              <AppInitializer>{children}</AppInitializer>
            </AppDataProvider>
            <Toaster />
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
