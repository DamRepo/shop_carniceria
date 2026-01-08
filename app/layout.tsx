import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Toaster } from 'sonner';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Carnicería El Negro - Fábrica de embutidos',
  description: 'Carnicería y fábrica de embutidos. Precio y calidad en carnes rojas, pollo, embutidos y congelados.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Carnicería El Negro - Fábrica de embutidos',
    description: 'Carnicería y fábrica de embutidos. Precio y calidad en carnes rojas, pollo, embutidos y congelados.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
