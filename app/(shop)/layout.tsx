import { Suspense } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PromoTopBanner } from "@/components/promo-top-banner";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { DeliveryBanner } from "@/components/delivery-banner";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <PromoTopBanner />
        <Header />
        <DeliveryBanner />
      </Suspense>

      <main className="flex-1">{children}</main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>

      <WhatsAppButton />
    </div>
  );
}