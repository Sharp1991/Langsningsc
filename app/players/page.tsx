import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Player = {
  id: number;
  name: string;
  position: string | null;
  nationality: string | null;
  photo_url: string | null;
  Jersey: number | null;
};

export default async function PlayersPage() {
  const { data: players, error } = await supabase
    .from("players")
    .select("id,name,position,nationality,photo_url,Jersey")
    .eq("team_id", 1)
    .order("Jersey", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-white px-5 py-16 text-zinc-900">
          <div className="mx-auto max-w-7xl">
            <h1 className="text-3xl font-black text-zinc-900">2026–27 SQUAD</h1>
            <p className="mt-4 text-red-400">
              Unable to load players.
            </p>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-white text-zinc-900">
        {/* Header */}
        <section className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 pb-12 pt-10 sm:px-8">
            <p className="text-xs font-semibold tracking-[0.3em] text-red-600">
              LANGSNING SPORTS CLUB
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-900 sm:text-6xl">
              2026–27 SQUAD
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-500 sm:text-base">
              Meet the Langsning FC squad for the 2026–27 season.
            </p>
          </div>
        </section>

        {/* Players */}
        <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
          {players && players.length > 0 ? (
            <>
              <div className="mb-6 flex items-center gap-4">
                <h2 className="text-xl font-bold sm:text-2xl">
                  FIRST TEAM
                </h2>

                <div className="h-px flex-1 bg-zinc-200" />

                <span className="text-xs text-zinc-400">
                  {players.length} PLAYERS
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {players.map((player) => (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md"
                  >
                    {/* Photo */}
                    <div className="relative aspect-[4/5] overflow-hidden bg-zinc-100">
                      {player.photo_url ? (
                        <img
                          src={player.photo_url}
                          alt={player.name}
                          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-5xl font-black text-zinc-200">
                          {player.Jersey ?? "—"}
                        </div>
                      )}

                      {/* Jersey */}
                      <div className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-sm font-black text-zinc-900 shadow backdrop-blur">
                        {player.Jersey ?? "—"}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-4">
                      <h3 className="truncate text-base font-bold text-zinc-900">
                        {player.name}
                      </h3>

                      <p className="mt-1 text-xs text-zinc-500">
                        {player.position || "Player"}
                      </p>

                      <p className="mt-1 text-xs text-zinc-400">
                        {player.nationality || "Nationality not listed"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
              <h2 className="text-xl font-bold text-zinc-900">
                No players found
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Add players to the Supabase players table.
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
