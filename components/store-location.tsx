import { MapPin, Navigation, Clock3, Store } from "lucide-react";

export function StoreLocation() {
  const directionsUrl = "https://maps.app.goo.gl/ndcReNdoTpBfUnLk6";

  return (
    <section className="w-full bg-gradient-to-b from-background via-muted/30 to-background py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Ubicación del local
            </span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Encontranos en <span className="text-primary">San José de Feliciano</span>
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Hacé tu pedido online y retiralo en el local, o abrí la ubicación en
            Google Maps para llegar más fácil.
          </p>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-border/60 bg-background shadow-[0_10px_40px_rgba(0,0,0,0.12)]">
          <div className="grid lg:grid-cols-[1.45fr_0.9fr]">
            <div className="relative min-h-[320px] lg:min-h-[520px]">
              <iframe
                title="Ubicación Carnicería El Negro"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d737.2855821453717!2d-58.75002277487716!3d-30.380557201869514!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x944d3529b6d86cb7%3A0x1bfdd05d2e075983!2sCarniceria%20El%20Negro!5e1!3m2!1ses!2sar!4v1773428090713!5m2!1ses!2sar"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full"
              />
            </div>

            <div className="flex flex-col justify-between border-t lg:border-l lg:border-t-0">
              <div className="p-6 md:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <Store className="h-6 w-6 text-primary" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold md:text-2xl">
                      Carnicería El Negro
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Atención en local y retiro de pedidos
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-2xl border bg-muted/30 p-4">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">Ubicación</p>
                      <p className="text-sm text-muted-foreground">
                        San José de Feliciano, Entre Ríos, Argentina
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border bg-muted/30 p-4">
                    <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">Modalidad</p>
                      <p className="text-sm text-muted-foreground">
                        Comprá online y retirás en el local de forma rápida y
                        sencilla.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:scale-[1.01] hover:bg-primary/90"
                  >
                    <Navigation className="h-4 w-4" />
                    Cómo llegar con Google Maps
                  </a>
                </div>
              </div>

             
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}