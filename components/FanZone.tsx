export default function FanZone() {
  const fanSections = [
    {
      title: "Supporters",
      text: "Stories, voices and memories from the people who stand behind Langsning FC.",
      icon: "⚽",
    },
    {
      title: "Match Memories",
      text: "Relive important games, celebrations and unforgettable moments.",
      icon: "📸",
    },
    {
      title: "Community",
      text: "A place where fans connect and celebrate the Langsning spirit.",
      icon: "❤️",
    },
  ];

  return (
    <section className="bg-red-700 py-24 text-white">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-14">
          <p className="text-xs uppercase tracking-[0.3em] text-red-200">
            Fan Zone
          </p>

          <h2 className="mt-4 text-4xl font-semibold">
            The Heart of Langsning
          </h2>

          <p className="mt-5 max-w-2xl text-white/80">
            More than a football club — a community connected by passion,
            pride and the love of the game.
          </p>
        </div>


        <div className="grid gap-6 md:grid-cols-3">

          {fanSections.map((item) => (
            <div
              key={item.title}
              className="rounded-xl bg-white/10 p-8 backdrop-blur"
            >

              <div className="text-3xl">
                {item.icon}
              </div>

              <h3 className="mt-5 text-xl font-semibold">
                {item.title}
              </h3>

              <p className="mt-3 text-white/70">
                {item.text}
              </p>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}
