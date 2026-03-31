import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Política de Privacidad | Carnicería El Negro",
    description:
        "Conocé cómo recopilamos, usamos y protegemos tus datos personales en Carnicería El Negro.",
};

export default function PoliticaDePrivacidadPage() {
    const updatedAt = "7 de marzo de 2026";

    return (
        <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="rounded-2xl border bg-background p-6 sm:p-8 shadow-sm">
                <header className="mb-8">
                    <p className="text-sm text-muted-foreground mb-2">
                        Última actualización: {updatedAt}
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                        Política de Privacidad
                    </h1>
                    <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-7">
                        En <strong>Carnicería El Negro</strong> valoramos tu privacidad y
                        nos comprometemos a proteger los datos personales que nos brindás al
                        utilizar nuestro sitio web, realizar compras o contactarte con
                        nosotros.
                    </p>
                </header>

                <div className="space-y-8 text-sm sm:text-base leading-7 text-foreground">
                    <section>
                        <h2 className="text-xl font-semibold mb-3">
                            1. Responsable del tratamiento de los datos
                        </h2>
                        <p className="text-muted-foreground">
                            El responsable del tratamiento de tus datos personales es{" "}
                            <strong>Carnicería El Negro</strong>.
                        </p>

                        <div className="mt-4 rounded-xl border bg-muted/40 p-4 space-y-1 text-muted-foreground">
                            <p>
                                <strong>Nombre comercial:</strong> Carnicería El Negro
                            </p>
                            <p>
                                <strong>Domicilio:</strong> Calle Sarmiento N° 403, San José de
                                Feliciano, Entre Ríos, Argentina
                            </p>
                            <p>
                                <strong>Teléfono:</strong> +54 9 3458 556104
                            </p>
                            <p>
                                <strong>Correo electrónico:</strong>{" "}
                                soporte@carniceriaelnegro.com
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">
                            2. Qué datos recopilamos
                        </h2>
                        <p className="text-muted-foreground">
                            Podemos recopilar las siguientes categorías de datos personales:
                        </p>

                        <ul className="mt-3 list-disc pl-5 space-y-2 text-muted-foreground">
                            <li>Nombre y apellido.</li>
                            <li>Teléfono de contacto.</li>
                            <li>Correo electrónico.</li>
                            <li>Dirección de entrega y datos de ubicación comercial.</li>
                            <li>Información vinculada a pedidos, compras y pagos.</li>
                            <li>Comentarios, consultas o mensajes enviados por formularios o WhatsApp.</li>
                            <li>
                                Datos técnicos básicos del uso del sitio, como IP, navegador,
                                dispositivo y cookies, cuando corresponda.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">
                            3. Para qué usamos tus datos
                        </h2>
                        <p className="text-muted-foreground">
                            Utilizamos tus datos personales para:
                        </p>

                        <ul className="mt-3 list-disc pl-5 space-y-2 text-muted-foreground">
                            <li>Procesar compras y gestionar pedidos.</li>
                            <li>Coordinar entregas o retiros en el local.</li>
                            <li>Brindar atención al cliente y soporte.</li>
                            <li>Enviar confirmaciones, avisos y comunicaciones sobre tu pedido.</li>
                            <li>Gestionar devoluciones, reclamos o solicitudes de arrepentimiento.</li>
                            <li>Mejorar la experiencia de navegación y funcionamiento del sitio.</li>
                            <li>
                                Cumplir obligaciones legales, fiscales, contables y de seguridad.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">
                            4. Base para el tratamiento
                        </h2>
                        <p className="text-muted-foreground">
                            Tratamos tus datos personales cuando son necesarios para gestionar
                            tu compra, responder consultas, cumplir obligaciones legales o
                            cuando nos otorgás tu consentimiento, según corresponda al caso.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">
                            5. Con quién podemos compartir tus datos
                        </h2>
                        <p className="text-muted-foreground">
                            No vendemos tus datos personales. Podemos compartirlos únicamente
                            cuando resulte necesario con:
                        </p>

                        <ul className="mt-3 list-disc pl-5 space-y-2 text-muted-foreground">
                            <li>Plataformas de pago y procesadores de cobro.</li>
                            <li>Proveedores tecnológicos del sitio web y hosting.</li>
                            <li>Servicios de mensajería, logística o entrega.</li>
                            <li>
                                Autoridades públicas o administrativas, cuando exista una
                                obligación legal.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">
                            6. Conservación de los datos
                        </h2>
                        <p className="text-muted-foreground">
                            Conservaremos tus datos personales durante el tiempo necesario
                            para cumplir con la finalidad para la que fueron recopilados y,
                            cuando corresponda, durante los plazos exigidos por obligaciones
                            legales, contables, fiscales o de defensa ante reclamos.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">
                            7. Seguridad de la información
                        </h2>
                        <p className="text-muted-foreground">
                            Aplicamos medidas técnicas y organizativas razonables para
                            proteger tus datos personales contra accesos no autorizados,
                            pérdida, alteración o divulgación indebida. Sin embargo, ningún
                            sistema es completamente invulnerable y no podemos garantizar una
                            seguridad absoluta.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">
                            8. Cookies y tecnologías similares
                        </h2>
                        <p className="text-muted-foreground">
                            Este sitio puede utilizar cookies y herramientas similares para
                            recordar preferencias, mejorar el rendimiento del sitio y obtener
                            estadísticas de uso. Podés configurar tu navegador para rechazar o
                            eliminar cookies, aunque algunas funciones podrían verse afectadas.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">
                            9. Tus derechos sobre tus datos personales
                        </h2>
                        <p className="text-muted-foreground">
                            Como titular de datos personales, podés solicitar el acceso a tus
                            datos, su rectificación, actualización o supresión, de acuerdo con
                            la normativa vigente.
                        </p>

                        <div className="mt-4 rounded-xl border bg-muted/40 p-4 text-muted-foreground">
                            <p>
                                Para ejercer estos derechos, escribinos a{" "}
                                <strong>soporte@carniceriaelnegro.com</strong> indicando tu nombre,
                                medio de contacto y detalle de la solicitud.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">
                            10. Menores de edad
                        </h2>
                        <p className="text-muted-foreground">
                            Este sitio no está dirigido de manera específica a menores de
                            edad. Si detectamos que se han recopilado datos personales de un
                            menor sin la debida autorización de su representante legal, podremos
                            eliminar esa información.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">
                            11. Enlaces a terceros
                        </h2>
                        <p className="text-muted-foreground">
                            Nuestro sitio puede contener enlaces a sitios o servicios de
                            terceros, como redes sociales o plataformas de pago. No somos
                            responsables por las prácticas de privacidad de esos terceros.
                            Recomendamos revisar sus políticas correspondientes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">
                            12. Cambios a esta política
                        </h2>
                        <p className="text-muted-foreground">
                            Podemos actualizar esta Política de Privacidad en cualquier
                            momento para reflejar cambios legales, técnicos o comerciales. La
                            versión vigente será la publicada en esta página con su fecha de
                            última actualización.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">13. Contacto</h2>
                        <p className="text-muted-foreground">
                            Si tenés dudas sobre esta Política de Privacidad o sobre el uso de
                            tus datos personales, podés contactarnos en:
                        </p>

                        <div className="mt-4 rounded-xl border bg-muted/40 p-4 space-y-1 text-muted-foreground">
                            <p>
                                <strong>Carnicería El Negro</strong>
                            </p>
                            <p>Calle Sarmiento N° 403, San José de Feliciano, Entre Ríos</p>
                            <p>Tel.: +54 9 3458 556104</p>
                        </div>
                    </section>

                    <section className="pt-2">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            <p>
                                <strong>Aviso:</strong> Esta política puede ser actualizada en cualquier momento
                                para reflejar cambios en la legislación vigente o en el funcionamiento del
                                sitio web. La versión actualizada estará siempre disponible en esta página.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}