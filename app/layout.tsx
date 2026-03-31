import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Carnicería El Negro | Carnes Frescas en Feliciano, Entre Ríos",
    template: "%s | Carnicería El Negro - Feliciano",
  },
  description:
    "Carnicería online en San José de Feliciano, Entre Ríos. Comprá carne vacuna, cerdo, pollo, embutidos artesanales y congelados. Retirá en menos de 24 hs. Calidad y buenos precios.",
  keywords: [
    "carnicería Feliciano",
    "carnicería San José de Feliciano",
    "carnicería Entre Ríos",
    "carnicería online",
    "comprar carne online",
    "carne fresca Feliciano",
    "carne vacuna",
    "carne de cerdo",
    "cortes de carne",
    "carne argentina",
    "embutidos artesanales",
    "carnicería El Negro",
    "Villaba carnicería",
    "carnicería cerca",
    "mejor carne",
  ],
  authors: [{ name: "Carnicería El Negro" }],
  creator: "Carnicería El Negro - Villaba",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: siteUrl,
    siteName: "Carnicería El Negro",
    title: "Carnicería El Negro | Carnes Frescas en Feliciano, Entre Ríos",
    description:
      "Carnicería online en San José de Feliciano, Entre Ríos. Carne vacuna, cerdo, pollo, embutidos artesanales. Retirá en menos de 24 hs.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Carnicería El Negro - Feliciano, Entre Ríos",
      },
    ],
  },
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MeatEstablishment",
  name: "Carnicería El Negro",
  description:
    "Carnicería y fábrica de embutidos artesanales en San José de Feliciano, Entre Ríos.",
  url: siteUrl,
  image: `${siteUrl}/og-image.png`,
  address: {
    "@type": "PostalAddress",
    addressLocality: "San José de Feliciano",
    addressRegion: "Entre Ríos",
    addressCountry: "AR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: "-30.3833",
    longitude: "-58.75",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "07:00",
      closes: "13:00",
    },
  ],
  servesCuisine: ["Carnes", "Embutidos", "Productos congelados"],
  hasMap: `https://maps.google.com/?q=San+José+de+Feliciano,+Entre+Ríos`,
  priceRange: "$$",
  currenciesAccepted: "ARS",
  paymentAccepted: "Efectivo, Mercado Pago",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>
          {children}
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}