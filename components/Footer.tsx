import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-white">

      {/* Call to Action */}
      <div className="border-b border-gray-800 bg-red-700 py-16 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h3 className="text-3xl md:text-4xl font-bold uppercase tracking-wide">
            Join the Movement
          </h3>
          <p className="mt-4 text-white/90 leading-7">
            Every fan, every memory, every match — this is a hub built by
            supporters, for supporters. Be part of the story of Langsning FC.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-12">

          {/* Brand */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Langsning FC"
                width={40}
                height={40}
              />
              <div>
                <h3 className="text-lg font-bold leading-tight">
                  LANGSNING FC
                </h3>
                <p className="text-xs uppercase tracking-[0.3em] text-red-500">
                  Fan Hub
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-xs text-sm leading-6 text-gray-400">
              An unofficial fan website celebrating Langsning Football Club —
              its history, players, and the supporters who never stopped
              showing up.
            </p>
          </div>

          {/* For Fans */}
          <div className="md:col-span-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              For Fans
            </h4>
            <p className="mt-5 text-sm leading-6 text-gray-400">
              Have a photo, story, or memory of Langsning FC you'd like
              to see featured here? Fan contributions will be welcomed
              on this site soon.
            </p>
          </div>

          {/* Disclaimer */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Disclaimer
            </h4>
            <p className="mt-5 text-sm leading-6 text-gray-400">
              This is an unofficial supporter project and is not affiliated
              with Langsning FC or any football association.
            </p>
          </div>

        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-gray-800 pt-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} We Are Langsning. Built by fans.</p>
          <p className="text-gray-600">Jaiaw Langsning, Shillong, Meghalaya</p>
        </div>
      </div>
    </footer>
  );
}
