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
    <footer className="mt-20 w-full bg-zinc-950 text-zinc-300">
      <div className="mx-auto max-w-screen-2xl px-6 py-14">

        {/* columnas */}
        <div className="grid gap-12 md:grid-cols-3">

          {/* marca */}
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-white">
              Carnicería El Negro
            </h2>

            <p className="text-sm leading-6 text-zinc-400 max-w-xs">
              Compra online de forma simple y segura. Elegí tus productos y
              coordiná retiro o entrega.
            </p>

            <div className="space-y-3 text-sm">

              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-red-500 mt-1" />
                <p>
                  Calle Sarmiento N°403
                  <br />
                  San José de Feliciano, Entre Ríos
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-red-500" />
                <a
                  href="tel:+5493458556104"
                  className="hover:text-white transition"
                >
                  +54 9 3458 556104
                </a>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-red-500 mt-1" />
                <p>
                  Lunes a Sábado: 7:30 - 13:00 / 16:00 - 21:00
                  <br />
                  Domingos: 8:00 - 13:00
                </p>
              </div>

            </div>
          </div>

          {/* links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Información
            </h3>

            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/terminos-y-condiciones"
                  className="hover:text-white transition"
                >
                  Términos y condiciones
                </Link>
              </li>

              <li>
                <Link
                  href="/politica-de-privacidad"
                  className="hover:text-white transition"
                >
                  Política de privacidad
                </Link>
              </li>

              <li>
                <Link
                  href="/soporte"
                  className="hover:text-white transition"
                >
                  Soporte
                </Link>
              </li>
            </ul>
          </div>

          {/* arrepentimiento */}
          <div className="space-y-6">

            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Atención al cliente
            </h3>

            <p className="text-sm text-zinc-400 leading-6">
              Si tuviste un problema con tu compra online podés comunicarte con
              nosotros o solicitar la cancelación.
            </p>

            <Link
              href="/arrepentimiento"
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition"
            >
              <RotateCcw className="h-4 w-4" />
              Botón de arrepentimiento
            </Link>

            {/* redes */}
            <div className="flex gap-3 pt-2">

              <a
                href="https://wa.me/5493458556104"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 hover:border-green-500 transition"
              >
                <MessageCircle className="h-4 w-4" />
              </a>

              <a
                href="https://www.instagram.com/elnegrocarniceria/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 hover:border-pink-500 transition"
              >
                <Instagram className="h-4 w-4" />
              </a>

              <a
                href="https://www.facebook.com/sergio744470"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 hover:border-blue-500 transition"
              >
                <Facebook className="h-4 w-4" />
              </a>

            </div>

          </div>
        </div>

        {/* separador */}
        <div className="border-t border-zinc-800 my-10"></div>

        {/* pagos centrados */}
        <div className="flex flex-col items-center gap-4">

          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <CreditCard className="h-4 w-4" />
            Medios de pago aceptados
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {paymentMethods.map((method) => (
              <div
                key={method.name}
                className="relative h-10 w-16 rounded-md bg-white p-1"
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

          <p className="text-sm text-zinc-500 pt-4 text-center">
            © {new Date().getFullYear()} Carnicería El Negro. Todos los derechos reservados.
          </p>

        </div>
      </div>
    </footer>
  );
}