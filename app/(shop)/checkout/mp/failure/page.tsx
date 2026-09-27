import { MpPaymentStatusWatcher } from "../MpPaymentStatusWatcher";

export const dynamic = "force-dynamic";

export default function MpFailurePage({
  searchParams,
}: {
  searchParams: { csId?: string };
}) {
  // MP vuelve con el csId de la back_url (preference/route.ts). El redirect a
  // failure no es definitivo: el pago puede acreditarse después, y el watcher
  // corrige el mensaje si pasa.
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <MpPaymentStatusWatcher csId={searchParams?.csId || null} failedTitle="Pago rechazado ❌" />
    </div>
  );
}
