import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative h-[90vh] md:h-screen overflow-hidden pt-16 md:pt-20">

      <Image
        src="/hero.png"
        alt="Langsning FC"
        fill
        priority
        className="object-cover"
      />

      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/90 via-black/50 to-transparent" />

      <div className="relative z-10 flex h-full items-end md:items-center px-6 md:px-16 pb-16 md:pb-0">
        <div className="max-w-2xl">

          <p className="mb-3 md:mb-4 text-xs md:text-sm uppercase tracking-[0.4em] md:tracking-[0.5em] text-white">
            Welcome
          </p>

          <h1 className="text-4xl md:text-8xl font-extrabold uppercase leading-none text-red-600">
            WE ARE
            <br />
            LANGSNING
          </h1>

          <p className="mt-5 md:mt-8 max-w-xl text-base md:text-xl text-gray-200">
            United by Football. Driven by Passion.
          </p>

        </div>
      </div>
    </section>
  );
}
