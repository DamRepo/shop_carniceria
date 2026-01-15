import Hero from "./components/Hero";
import Band from "./components/Band";
import Split from "./components/Split";
import Closing from "./components/Closing";

export default function SobreNosotrosPage() {
  return (
    <main className="bg-black text-zinc-200">
      <Hero />

      <Band
        kicker="Nuestra filosofía"
        desc="Creemos firmemente en la profesionalización como base del crecimiento de nuestro rubro y en la mejora continua del servicio. Por eso, desde nuestros inicios cumplimos con todas las habilitaciones y normativas correspondientes a cada una de las actividades que desarrollamos."
      />

      <Split
        side="left"
        kicker="Confianza del cliente"
        desc="Valoramos profundamente la elección y la confianza de nuestros clientes. Por eso, trabajamos todos los días para mejorar la experiencia de compra: desde la selección de cortes y elaborados, hasta la atención y el cuidado en cada detalle. Escuchamos sugerencias, ajustamos procesos y buscamos que cada visita sea más cómoda, más rápida y con la calidad de siempre."
        bullets={[
          "Atención cercana y responsable en mostrador y online.",
          "Selección diaria y control de calidad en productos y elaborados.",
          "Mejoras constantes en el servicio para que comprar sea más simple.",
        ]}
        image={{ src: "/gondola.jpeg", alt: "Carnicería El Negro - mostrador" }}
      />

      <Band
        kicker="PENSAMOS EN NUESTROS CLIENTES"
        desc="Trabajamos para brindar una experiencia de compra cercana, cómoda y satisfactoria, respaldada por la calidad de nuestros productos y por el compromiso de cada integrante de nuestro equipo"
      />

      <Split
        side="right"
        kicker="Visión a futuro"
        desc="Creemos en un crecimiento sostenido que combine la experiencia del comercio tradicional con nuevas herramientas digitales. Apostamos a la innovación y a la mejora continua como camino para adaptarnos a las nuevas formas de consumo, sin perder la cercanía y el trato de siempre."
        bullets={[
          "Desarrollo y fortalecimiento de nuestros canales digitales.",
          "Optimización constante de procesos y atención al cliente.",
          "Adaptación a nuevas demandas sin perder nuestra identidad.",
        ]}
        image={{
          src: "/river.jpg",
          alt: "Visión a futuro - Carnicería El Negro",
        }}
      />

      <Closing />
    </main>
  );
}
