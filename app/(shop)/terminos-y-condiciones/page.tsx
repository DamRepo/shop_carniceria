import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones | Carnicería El Negro",
  description:
    "Condiciones de uso y compra del sitio web de Carnicería El Negro.",
};

export default function TerminosPage() {
  const updatedAt = "7 de marzo de 2026";

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-2xl border bg-background p-6 sm:p-8 shadow-sm">

        <header className="mb-8">
          <p className="text-sm text-muted-foreground mb-2">
            Última actualización: {updatedAt}
          </p>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Términos y Condiciones
          </h1>

          <p className="mt-4 text-muted-foreground leading-7">
            Estos Términos y Condiciones regulan el acceso, navegación y uso del
            sitio web de <strong>Carnicería El Negro</strong>, así como la compra
            de productos ofrecidos a través de la plataforma.
          </p>
        </header>

        <div className="space-y-8 text-sm sm:text-base leading-7">

          <section>
            <h2 className="text-xl font-semibold mb-3">
              1. Identificación del proveedor
            </h2>

            <div className="rounded-xl border bg-muted/40 p-4 space-y-1 text-muted-foreground">
              <p><strong>Nombre comercial:</strong> Carnicería El Negro</p>
              <p><strong>Domicilio:</strong> Calle Sarmiento N°403</p>
              <p>San José de Feliciano, Entre Ríos, Argentina</p>
              <p><strong>Teléfono:</strong> +54 9 3458 556104</p>
              <p><strong>Email:</strong>soporte@carniceriaelnegro.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              2. Uso del sitio web
            </h2>

            <p className="text-muted-foreground">
              El acceso y uso de este sitio implica la aceptación de los
              presentes términos. El usuario se compromete a utilizar el sitio
              de manera lícita, respetando la legislación vigente y evitando
              cualquier conducta que pueda afectar el funcionamiento del
              servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              3. Productos
            </h2>

            <p className="text-muted-foreground">
              Los productos ofrecidos corresponden a alimentos frescos y otros
              productos comercializados por Carnicería El Negro.
            </p>

            <p className="text-muted-foreground mt-3">
              Las imágenes publicadas son ilustrativas. El peso final de los
              productos puede variar ligeramente según el corte y preparación
              del producto.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              4. Precios
            </h2>

            <p className="text-muted-foreground">
              Todos los precios se expresan en pesos argentinos (ARS) e incluyen
              impuestos aplicables salvo indicación contraria.
            </p>

            <p className="text-muted-foreground mt-3">
              Carnicería El Negro se reserva el derecho de modificar precios,
              promociones u ofertas sin previo aviso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              5. Proceso de compra
            </h2>

            <p className="text-muted-foreground">
              Para realizar una compra, el usuario debe seleccionar los productos
              deseados, agregarlos al carrito y completar los datos requeridos
              para el pedido.
            </p>

            <p className="text-muted-foreground mt-3">
              La confirmación del pedido se realizará una vez que el sistema
              procese correctamente la solicitud y se confirme el pago o
              reserva del pedido.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              6. Formas de pago
            </h2>

            <p className="text-muted-foreground">
              El sitio puede ofrecer distintos medios de pago, tales como
              tarjetas de crédito, tarjetas de débito o plataformas de pago
              online.
            </p>

            <p className="text-muted-foreground mt-3">
              Los pagos son procesados por proveedores externos de servicios de
              pago, por lo que Carnicería El Negro no almacena datos completos de
              tarjetas o medios de pago.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              7. Envíos y retiros
            </h2>

            <p className="text-muted-foreground">
              Los pedidos pueden retirarse en el local o enviarse al domicilio
              indicado por el cliente, según las opciones disponibles al momento
              de la compra.
            </p>

            <p className="text-muted-foreground mt-3">
              Los horarios de entrega o retiro pueden variar según disponibilidad
              operativa y volumen de pedidos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              8. Cambios y devoluciones
            </h2>

            <p className="text-muted-foreground">
              Si un producto presenta algún inconveniente, el cliente podrá
              comunicarse con el comercio para evaluar la situación y coordinar
              un cambio o solución correspondiente.
            </p>

            <p className="text-muted-foreground mt-3">
              En el caso de compras realizadas a distancia, el consumidor podrá
              ejercer su derecho de arrepentimiento dentro de los plazos
              establecidos por la legislación vigente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              9. Derecho de arrepentimiento
            </h2>

            <p className="text-muted-foreground">
              Conforme a la normativa de defensa del consumidor, el usuario
              puede revocar la aceptación de una compra realizada a distancia
              dentro del plazo legal correspondiente.
            </p>

            <p className="text-muted-foreground mt-3">
              Para ello podrá utilizar el botón de arrepentimiento disponible
              en el sitio web o comunicarse a través de los medios de contacto
              indicados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              10. Propiedad intelectual
            </h2>

            <p className="text-muted-foreground">
              Todos los contenidos del sitio, incluyendo textos, imágenes,
              logotipos y diseño, pertenecen a Carnicería El Negro o a sus
              respectivos titulares y se encuentran protegidos por la legislación
              vigente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              11. Limitación de responsabilidad
            </h2>

            <p className="text-muted-foreground">
              Carnicería El Negro no será responsable por interrupciones del
              servicio causadas por factores externos, fallas técnicas o
              problemas de conectividad fuera de su control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              12. Modificaciones
            </h2>

            <p className="text-muted-foreground">
              Carnicería El Negro podrá modificar estos Términos y Condiciones
              en cualquier momento. Las modificaciones entrarán en vigencia
              desde su publicación en el sitio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              13. Legislación aplicable
            </h2>

            <p className="text-muted-foreground">
              Estos términos se rigen por las leyes de la República Argentina.
            </p>
          </section>

        </div>

      </div>
    </main>
  );
}