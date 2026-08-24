import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-[#c8102e] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10 md:py-12">
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

                <p className="text-xs uppercase tracking-[0.3em] text-white">
                  Fan Hub
                </p>
              </div>
            </div>

            <p className="mt-4 max-w-md text-xs leading-5 text-white/80">
              An unofficial fan website celebrating Langsning Football Club —
              its history, players, matches, stories, and the supporters who
              continue to keep the club's story alive.
            </p>
          </div>

          {/* About */}
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90">
              About This Site
            </h4>

            <p className="mt-4 max-w-md text-xs leading-5 text-white/80">
              This is an unofficial supporter project created to document and
              celebrate Langsning FC. It is not affiliated with Langsning FC,
              the Shillong Sports Association, or any football association.
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 flex flex-col gap-2 border-t border-white/20 pt-5 text-[10px] text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} We Are Langsning. Built by fans.
          </p>

          <p className="text-white/60">
            Jaiaw Langsning, Shillong, Meghalaya
          </p>
        </div>
      </div>
    </footer>
  );
}
