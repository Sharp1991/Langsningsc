import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 md:gap-20">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Langsning FC"
                width={42}
                height={42}
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

            <p className="mt-5 max-w-md text-sm leading-6 text-gray-400">
              An unofficial fan website celebrating Langsning Football Club —
              its history, players, matches, stories, and the supporters who
              continue to keep the club's story alive.
            </p>
          </div>

          {/* About */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              About This Site
            </h4>

            <p className="mt-5 max-w-md text-sm leading-6 text-gray-400">
              This is an unofficial supporter project created to document and
              celebrate Langsning FC. It is not affiliated with Langsning FC,
              the Shillong Sports Association, or any football association.
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col gap-3 border-t border-gray-800 pt-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} We Are Langsning. Built by fans.
          </p>

          <p className="text-gray-600">
            Jaiaw Langsning, Shillong, Meghalaya
          </p>
        </div>
      </div>
    </footer>
  );
}
