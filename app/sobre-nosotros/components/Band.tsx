type Props = { kicker: string; desc: string };

export default function Band({ kicker, desc }: Props) {
  return (
    <section className="bg-zinc-950/40 border-b border-zinc-800">
      <div className="container mx-auto max-w-7xl px-4 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs tracking-widest uppercase text-red-500">
            {kicker}
          </p>

          {/* separador sutil para “ocupar” y dar presencia */}
          <div className="mx-auto mt-6 h-px w-24 bg-zinc-800" />

          <p className="mt-8 text-lg sm:text-xl text-zinc-200 leading-relaxed">
            {desc}
          </p>
        </div>
      </div>
    </section>
  );
}
