import { Suspense } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PromoTopBanner } from "@/components/promo-top-banner";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { DeliveryBanner } from "@/components/delivery-banner";
import { ExitIntentPopup } from "@/components/exit-intent-popup";
import { FeedbackWidget } from "@/components/feedback-widget";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PromoTopBanner />
      <Header />
      <DeliveryBanner />

      <main className="flex-1">{children}</main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>

      <WhatsAppButton />
      <ExitIntentPopup />
      <FeedbackWidget />
    </div>
  );
}