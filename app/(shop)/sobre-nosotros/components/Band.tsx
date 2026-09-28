type Props = { kicker: string; desc: string };

export default function Band({ kicker, desc }: Props) {
  return (
    <section className="bg-muted/40 border-b border-border">
      <div className="container mx-auto max-w-7xl px-4 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs tracking-widest uppercase text-red-500">
            {kicker}
          </p>

          {/* separador sutil para “ocupar” y dar presencia */}
          <div className="mx-auto mt-6 h-px w-24 bg-border" />

          <p className="mt-8 text-lg sm:text-xl text-foreground leading-relaxed">
            {desc}
          </p>
        </div>
      </div>
    </section>
  );
}

