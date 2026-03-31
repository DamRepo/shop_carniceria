import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Phone, MessageCircle, Instagram, Facebook } from "lucide-react";

const WHATSAPP_PHONE_E164 = "543458556104"; 
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_PHONE_E164}`;
const WHATSAPP_TEXT =
  "https://wa.me/"  
  WHATSAPP_PHONE_E164 +
  "?text=" +
  encodeURIComponent("Hola! Tengo una consulta sobre mi pedido.");

const INSTAGRAM_URL = "https://www.instagram.com/elnegrocarniceria?igsh=MW9mYWFycTMyYXZxdg=="; 
const FACEBOOK_URL = "https://www.facebook.com/share/1CPUH8rFxk/"; 

export default function PreguntasFrecuentesPage() {
  return (
    <main className="container mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Preguntas frecuentes</h1>
        <p className="text-zinc-400 mt-2">
          Respuestas rápidas para que compres sin vueltas.
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 p-4 sm:p-6">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="envios" className="border-zinc-800">
            <AccordionTrigger className="text-zinc-100 hover:text-red-400">
              ¿Hacen envíos a domicilio?
            </AccordionTrigger>
            <AccordionContent className="text-zinc-300">
              ¡Hola! Por ahora no estamos haciendo envíos, pero podés mandar a
              alguien a buscar tu compra sin problemas. Avisanos los datos de
              quién retira y se lo entregamos.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pagos" className="border-zinc-800">
            <AccordionTrigger className="text-zinc-100 hover:text-red-400">
              ¿Cuáles son los medios de pagos habilitados?
            </AccordionTrigger>
            <AccordionContent className="text-zinc-300">
              Aceptamos todas las tarjetas de crédito y débito, pagos
              electrónicos (como transferencias o billeteras virtuales) y
              efectivo que lo abonás en el local.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="estado" className="border-zinc-800">
            <AccordionTrigger className="text-zinc-100 hover:text-red-400">
              Una vez que confirme mi pedido ¿Cómo puedo saber el estado del
              mismo?
            </AccordionTrigger>
            <AccordionContent className="text-zinc-300">
              Tu pedido estará listo dentro de la franja horaria que elegiste.
              Ante cualquier eventualidad, nos pondremos en contacto con vos.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="retiro" className="border-zinc-800">
            <AccordionTrigger className="text-zinc-100 hover:text-red-400">
              ¿Qué necesito para retirar mi pedido?
            </AccordionTrigger>
            <AccordionContent className="text-zinc-300">
              Para retirar tu pedido solo necesitás presentar el número de orden.
              En caso de enviar a un tercero o un servicio de mensajería, por
              favor dejános su nombre y apellido previamente para autorizar la
              entrega.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="hora" className="border-zinc-800">
            <AccordionTrigger className="text-zinc-100 hover:text-red-400">
              ¿Hasta qué hora puedo realizar un pedido?
            </AccordionTrigger>
            <AccordionContent className="text-zinc-300">
              Los pedidos se pueden realizar las 24hs. Si querés retirar tu
              pedido en el día, debés hacerlo antes de las 19hs.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="otro-dia" className="border-zinc-800">
            <AccordionTrigger className="text-zinc-100 hover:text-red-400">
              ¿Puedo realizar un pedido para que sea entregado al otro día o
              cualquier otro día?
            </AccordionTrigger>
            <AccordionContent className="text-zinc-300">
              Por el momento solo podés realizar pedidos para ser entregados en
              el mismo día o para el día siguiente.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="problema" className="border-zinc-800">
            <AccordionTrigger className="text-zinc-100 hover:text-red-400">
              Si existe un problema con el pedido realizado ¿Qué hago?
            </AccordionTrigger>
            <AccordionContent className="text-zinc-300">
              Tranqui, te comunicas al{" "}
              <a
                href="tel:+543458556104"
                className="text-red-400 hover:text-red-300 underline underline-offset-4"
              >
                3458556104
              </a>{" "}
              de la forma que te quede más cómoda, y lo solucionamos.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      {/* Contacto */}
      <Card className="mt-6 bg-zinc-900 border-zinc-800 p-4 sm:p-6">
        <h2 className="text-xl font-semibold text-white">
          ¿Otra consulta o dudas?
        </h2>

        <p className="text-zinc-300 mt-2">
          Comunicate por nuestros medios de contacto:
          <span className="ml-2 text-zinc-100 font-medium">📱 3458556104</span>
        </p>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
            <a
              href={WHATSAPP_TEXT}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir WhatsApp"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </a>
          </Button>

          <Button asChild variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir Instagram"
            >
              <Instagram className="h-4 w-4 mr-2" />
              Instagram
            </a>
          </Button>

          <Button asChild variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir Facebook"
            >
              <Facebook className="h-4 w-4 mr-2" />
              Facebook
            </a>
          </Button>

          <Button asChild variant="ghost" className="text-zinc-300 hover:bg-zinc-800">
            <a href="tel:+543458556104" aria-label="Llamar por teléfono">
              <Phone className="h-4 w-4 mr-2" />
              Llamar
            </a>
          </Button>
        </div>

        <p className="text-xs text-zinc-500 mt-3">
          * WhatsApp se abre en una pestaña nueva. Si estás en celular, abre la app.
        </p>
      </Card>

      <div className="mt-6">
        <Link href="/" className="text-zinc-300 hover:text-red-400 underline underline-offset-4">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}

