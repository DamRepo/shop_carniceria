import Image from 'next/image';
import { MapPin, Phone, Clock, CreditCard } from 'lucide-react';

const paymentMethods = [
  { name: 'Visa', logo: '/payments/visa.png' },
  { name: 'Mastercard', logo: '/payments/mastercard.png' },
  { name: 'American Express', logo: '/payments/amex.png' },
  { name: 'Cabal', logo: '/payments/cabal.png' },
  { name: 'Naranja', logo: '/payments/naranja.png' },
];

export function Footer() {
  return (
    <footer className="w-full border-t bg-muted/50 mt-16">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Dirección */}
          <div className="flex items-start space-x-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Dirección</h3>
              <p className="text-sm text-muted-foreground">
                Calle Sarmiento<br />
                San Jose de Feliciano, Entre Rios 
              </p>
            </div>
          </div>

          {/* Teléfono */}
          <div className="flex items-start space-x-3">
            <Phone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Teléfono</h3>
              <p className="text-sm text-muted-foreground">
                +54 11 1234-5678
              </p>
            </div>
          </div>

          {/* Horarios */}
          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Horarios</h3>
              <p className="text-sm text-muted-foreground">
                Lunes a Sábado: 8:00 - 13:00 y de 17:00 a 21:00<br />
                Domingos: 8:00 - 12:00
              </p>
            </div>
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

        {/* Copyright y Créditos */}
        <div className="mt-8 pt-6 border-t space-y-2">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date()?.getFullYear?.()} Carnicería El Negro. Todos los derechos reservados.
          </p>
          <p className="text-center text-sm text-muted-foreground/70">
            Creado por <span className="font-semibold text-primary">Tecnia</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
