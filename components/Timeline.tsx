export default function Timeline() {
  const events = [
    {
      year: "1954",
      title: "The Beginning",
      text: "Langsning Football Club was founded in Jaiaw Langsning, Shillong.",
    },
    {
      year: "1997 - 2005",
      title: "Local Dominance",
      text: "The club won multiple Shillong First Division League titles.",
    },
    {
      year: "2011",
      title: "National Competition",
      text: "Langsning entered the I-League 2nd Division, representing Meghalaya at a higher level.",
    },
    {
      year: "2013",
      title: "Historic Campaign",
      text: "Finished fourth in the I-League 2nd Division, the club's best performance in the competition.",
    },
    {
      year: "2017 - 2018",
      title: "SPL Champions",
      text: "Won back-to-back Shillong Premier League titles.",
    },
    {
      year: "2025",
      title: "The Legacy Continues",
      text: "Added another Shillong Premier League title to the club's history.",
    },
  ];


  return (
    <section className="bg-[#faf8f4] py-24">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-14">
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Club Journey
          </p>

          <h2 className="mt-4 text-4xl font-semibold">
            Through the Years
          </h2>
        </div>


        <div className="grid gap-6 md:grid-cols-2">

          {events.map((event) => (
            <div
              key={event.year}
              className="rounded-lg border border-black/10 bg-white p-6"
            >

              <p className="font-mono text-sm text-red-700">
                {event.year}
              </p>

              <h3 className="mt-3 text-xl font-semibold">
                {event.title}
              </h3>

              <p className="mt-3 text-gray-600">
                {event.text}
              </p>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}
