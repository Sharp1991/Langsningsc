export default function ClubStats() {
  const details = [
    {
      title: "Full Name",
      value: "Langsning Football Club",
    },
    {
      title: "Nickname",
      value: "LSC / LFC",
    },
    {
      title: "Location",
      value: "Jaiaw Langsning, Shillong",
    },
    {
      title: "League",
      value: "Shillong Premier League",
    },
  ];

  return (
    <section className="bg-[#faf8f4] py-20">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Club Identity
          </p>

          <h2 className="mt-3 text-4xl font-semibold">
            The Pride of Langsning
          </h2>
        </div>


        <div className="grid gap-1 overflow-hidden rounded-lg border border-black/10 bg-black/10 md:grid-cols-4">

          {details.map((item) => (
            <div
              key={item.title}
              className="bg-white p-6"
            >
              <p className="text-xs uppercase tracking-wider text-gray-500">
                {item.title}
              </p>

              <h3 className="mt-3 text-lg font-semibold">
                {item.value}
              </h3>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}

