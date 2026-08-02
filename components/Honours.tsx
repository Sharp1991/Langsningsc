export default function Honours() {
  const honours = [
    {
      year: "2017",
      title: "Shillong Premier League Champions",
    },
    {
      year: "2018",
      title: "Shillong Premier League Champions",
    },
    {
      year: "2025",
      title: "Shillong Premier League Champions",
    },
    {
      year: "2012",
      title: "All India Independence Day Cup Champions",
    },
  ];

  return (
    <section className="bg-[#1c1817] py-24 text-white">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-14">
          <p className="text-xs uppercase tracking-[0.3em] text-red-300">
            Honours
          </p>

          <h2 className="mt-4 text-4xl font-semibold">
            A Legacy of Victory
          </h2>
        </div>


        <div className="relative border-l border-white/20 pl-8">

          {honours.map((item) => (
            <div
              key={item.year}
              className="relative mb-10"
            >

              <div className="absolute -left-[42px] top-2 h-4 w-4 rounded-full bg-red-700 ring-4 ring-red-700/30">
              </div>


              <p className="font-mono text-sm text-red-300">
                {item.year}
              </p>

              <h3 className="mt-2 text-xl font-semibold">
                🏆 {item.title}
              </h3>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}
