import Image from "next/image";
import {
  MapPin,
  Phone,
  Clock,
  CreditCard,
  MessageCircle,
  Instagram,
  Facebook,
} from "lucide-react";

const paymentMethods = [
  { name: "Visa", logo: "/payments/visa.png" },
  { name: "Mastercard", logo: "/payments/mastercard.png" },
  { name: "American Express", logo: "/payments/amex.png" },
  { name: "Cabal", logo: "/payments/cabal.png" },
  { name: "Naranja", logo: "/payments/naranja.png" },
];

// 🔹 URLs
const WHATSAPP_URL =
  "https://wa.me/5493458556104?text=Hola%20quiero%20hacer%20una%20consulta";
const INSTAGRAM_URL = "https://instagram.com/TU_USUARIO";
const FACEBOOK_URL = "https://facebook.com/TU_PAGINA";

export function Footer() {
  return (
    <footer className="w-full border-t bg-muted/50 mt-16">
      {/* ✅ CAMBIO: contenedor más ancho (antes: container + max-w-7xl) */}
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-10 py-8">
        {/* ✅ CAMBIO: gap más amplio en desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Dirección */}
          <div className="flex items-start gap-3 w-full">
            <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="font-semibold mb-1">Dirección</h3>
              <p className="text-sm text-muted-foreground">
                Calle Sarmiento N°403
                <br />
                San Jose de Feliciano, Entre Rios
              </p>
            </div>
          </div>

          {/* Teléfono */}
          <div className="flex items-start gap-3 w-full">
            <Phone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="font-semibold mb-1">Teléfono</h3>

              {/* ✅ CAMBIO: teléfono clickeable */}
              <a
                href="tel:+5493458556104"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Llamar por teléfono"
              >
                +54 9 3458 556104
              </a>
            </div>
          </div>

          {/* Horarios */}
          <div className="flex items-start gap-3 w-full">
            <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="font-semibold mb-1">Horarios</h3>
              <p className="text-sm text-muted-foreground">
                Lunes a Sábado: 7:30 - 13:00 y 17:00 - 22:00
                <br />
                Domingos: 8:00 - 12:00
              </p>
            </div>
          </div>

          {/* Redes y Contacto */}
          <div className="w-full">
            <h3 className="font-semibold mb-3">Contacto y Redes</h3>

            {/* ✅ CAMBIO: redes en fila + wrap para ocupar más ancho */}
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <a
                href={"https://l.instagram.com/?u=http%3A%2F%2Fwa.me%2F%2B543458556104%3Futm_source%3Dig%26utm_medium%3Dsocial%26utm_content%3Dlink_in_bio%26fbclid%3DPAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQMMjU2MjgxMDQwNTU4AAGn9x3xQyT-xr5Niml8d1D5n0mqJzaDuRQjW1qp-4mUoAo4ykIaQ04PEJhM1Y0_aem_PDb3zSgMIZ3r9W3kz8RYIw&e=AT67j8zVGAcPfe4W1Jhv6bqiZ7HmGlzXDrq8JbHZ67OOUfZMSx2WtBZk53LcizcMg2h2MFjap8em6Bb6IEclXKj-aO5TjWx53nZusM9HBw"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-green-500 transition-colors"
                aria-label="Abrir WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>

              <a
                href={"https://www.instagram.com/elnegrocarniceria/"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-pink-500 transition-colors"
                aria-label="Abrir Instagram"
              >
                <Instagram className="h-4 w-4" />
                Instagram
              </a>

              <a
                href={"https://www.facebook.com/sergio744470"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-blue-500 transition-colors"
                aria-label="Abrir Facebook"
              >
                <Facebook className="h-4 w-4" />
                Facebook
              </a>
            </div>

            {/* ✅ CAMBIO: mini nota */}
            <p className="text-xs text-muted-foreground mt-3">
              * WhatsApp se abre en una pestaña nueva.
              </p>
            <p className="text-xs text-muted-foreground mt-3">
                * En celular, abre la app.
            </p>
          </div>
        </div>

        {/* Medios de Pago */}
        <div className="mt-8 pt-8 border-t">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-5 w-5" />
              <h3 className="font-semibold text-sm">Medios de pago aceptados</h3>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              {paymentMethods.map((method) => (
                <div
                  key={method.name}
                  className="relative h-10 w-16 md:h-12 md:w-20 flex items-center justify-center bg-white/5 rounded-lg p-2 hover:bg-white/10 transition-colors"
                >
                  <Image
                    src={method.logo}
                    alt={method.name}
                    fill
                    className="object-contain p-1"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t space-y-2">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date()?.getFullYear?.()} Carnicería El Negro. Todos los
            derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}