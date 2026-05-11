import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Clock,
  MessageCircle,
  Instagram,
  Facebook,
  RotateCcw,
  CreditCard,
} from "lucide-react";

const paymentMethods = [
  { name: "Visa", logo: "/payments/visa.png" },
  { name: "Mastercard", logo: "/payments/mastercard.png" },
  { name: "American Express", logo: "/payments/amex.png" },
  { name: "Cabal", logo: "/payments/cabal.png" },
  { name: "Naranja", logo: "/payments/naranja.png" },
];

export function Footer() {
  return (
    <footer className="mt-20 w-full bg-charcoal text-smoke border-t-2 border-primary">
      <div className="mx-auto max-w-screen-2xl px-6 py-14">

        {/* Columnas */}
        <div className="grid gap-12 md:grid-cols-3">

          {/* Marca */}
          <div className="border-l-2 border-primary pl-4 space-y-5">
            <h2 className="font-display text-3xl tracking-widest text-foreground">
              Carnicería El Negro
            </h2>

            <p className="font-serif italic text-sm text-smoke">
              Desde hace más de 7 años. San José de Feliciano.
            </p>

            <p className="text-sm leading-6 text-smoke max-w-xs">
              Compra online de forma simple y segura. Elegí tus productos y
              coordiná retiro o entrega.
            </p>

            <div className="space-y-3 text-sm">

              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-1 shrink-0" />
                <p className="text-smoke">
                  Calle Sarmiento N°403
                  <br />
                  San José de Feliciano, Entre Ríos
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <a
                  href="tel:+5493458556104"
                  className="hover:text-foreground transition-colors"
                >
                  +54 9 3458 556104
                </a>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-primary mt-1 shrink-0" />
                <p className="text-smoke">
                  Lunes a Sábado: 7:30 - 13:00 / 16:00 - 21:00
                  <br />
                  Domingos: 8:30 - 13:00
                </p>
              </div>

            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-sans uppercase tracking-widest text-xs text-smoke mb-4">
              Información
            </h3>

            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/terminos-y-condiciones"
                  className="hover:text-foreground transition-colors"
                >
                  Términos y condiciones
                </Link>
              </li>

              <li>
                <Link
                  href="/politica-de-privacidad"
                  className="hover:text-foreground transition-colors"
                >
                  Política de privacidad
                </Link>
              </li>

              <li>
                <Link
                  href="/soporte"
                  className="hover:text-foreground transition-colors"
                >
                  Soporte
                </Link>
              </li>
            </ul>
          </div>

          {/* Atención al cliente */}
          <div className="space-y-6">

            <h3 className="font-sans uppercase tracking-widest text-xs text-smoke">
              Atención al cliente
            </h3>

            <p className="text-sm text-smoke leading-6">
              Si tuviste un problema con tu compra online podés comunicarte con
              nosotros o solicitar la cancelación.
            </p>

            <Link
              href="/arrepentimiento"
              className="inline-flex items-center gap-2 rounded-none bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-blood-dark transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Botón de arrepentimiento
            </Link>

            {/* Redes sociales */}
            <div className="flex gap-3 pt-2">

              <a
                href="https://wa.me/5493458556104"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex h-10 w-10 items-center justify-center border border-iron hover:border-green-500 hover:text-green-500 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
              </a>

              <a
                href="https://www.instagram.com/elnegrocarniceria/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center border border-iron hover:border-pink-500 hover:text-pink-500 transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>

              <a
                href="https://www.facebook.com/sergio744470"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center border border-iron hover:border-blue-500 hover:text-blue-500 transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>

            </div>

          </div>
        </div>

        {/* Separador */}
        <div className="border-t border-iron my-10" />

        {/* Pagos centrados */}
        <div className="flex flex-col items-center gap-4">

          <div className="flex items-center gap-2 text-sm text-smoke">
            <CreditCard className="h-4 w-4" />
            Medios de pago aceptados
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {paymentMethods.map((method) => (
              <div
                key={method.name}
                className="relative h-10 w-16 rounded-none bg-white p-1"
              >
                <Image
                  src={method.logo}
                  alt={method.name}
                  fill
                  className="object-contain"
                />
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-black py-4">
        <p className="text-xs text-smoke text-center">
          © {new Date().getFullYear()} Carnicería El Negro. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
