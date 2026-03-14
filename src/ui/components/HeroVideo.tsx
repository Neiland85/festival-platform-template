"use client"


export default function HeroVideo(){

  return(

    <section className="relative w-full h-[90vh] overflow-hidden">

      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute w-full h-full object-cover"
      >
        <source src="/hero/hero-solaris.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">

        <div className="text-center text-white space-y-6">

          <h1 className="text-5xl md:text-6xl font-semibold tracking-wide">
            Solaris Nerja
          </h1>

          <p className="text-xl opacity-90">
            18 — 28 Junio
          </p>

          <a
            href="#programacion"
            className="inline-block px-10 py-4 bg-white text-black text-lg font-medium rounded-full hover:bg-neutral-200 transition"
          >
            ENTRADAS
          </a>

        </div>

      </div>

    </section>

  )

}
