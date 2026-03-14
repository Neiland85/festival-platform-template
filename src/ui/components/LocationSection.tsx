export default function LocationSection() {
  return (
    <section className="py-24 bg-neutral-100">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-4xl mb-12 text-center">Ubicación</h2>

        <div className="w-full h-[500px]">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12842.6!2d-3.878!3d36.757!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd7221c21e26f165%3A0x40463fd8ca1c6c0!2sNerja%2C%20M%C3%A1laga!5e0!3m2!1ses!2ses"
            width="100%"
            height="100%"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="border-0"
            title="Ubicación de Solaris Nerja — El Playazo, Nerja"
          />
        </div>
      </div>
    </section>
  )
}
