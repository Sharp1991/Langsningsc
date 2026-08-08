import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ClubPerformance from "@/components/ClubPerformance";

export default function History() {
  return (
    <main className="bg-black pt-16 md:pt-20">
      <Navbar />

      <section className="bg-white py-24">
        <div className="mx-auto max-w-4xl px-6">

          <p className="text-xs uppercase tracking-[0.3em] text-red-700">
            Our History
          </p>

          <h2 className="mt-4 text-4xl font-semibold leading-tight">
            The Story of Langsning FC
          </h2>

          <div className="mt-10 space-y-6 text-lg leading-8 text-gray-600">

            <p>
              Langsning Football Club was founded in 1954 in the Jaiaw Langsning
              locality of Shillong, growing out of grassroots community football
              rooted in Khasi identity and local pride. For generations, the club
              has stood as a symbol of passion, dedication and belonging for the
              people of Jaiaw Langsning and the wider football community of
              Shillong.
            </p>

            <p>
              Long before Shillong Lajong rose to become the dominant name in the
              region, it was Langsning that ruled the Shillong football scene.
              Competing under the Blue Max FC banner after the club came under
              shared ownership, Langsning's sides dominated Shillong football
              through the 1970s, 80s and into the early 2000s. Much of that
              golden era was built on the strength of players from St. Anthony's
              School's 1975 batch — the first team from Meghalaya to win the
              Subroto Cup, coached by the legendary PK Banerjee. That generation
              of talent formed the backbone of a team that few could live with
              for the better part of three decades.
            </p>

            <p>
              As the football landscape in Shillong shifted and Lajong grew into
              the region's dominant force, Langsning's rivalry with them became
              one of the defining threads of the club's modern story — two sides
              shaped in part by the same city, competing for the same pride.
            </p>

            <p>
              Beyond its trophies, Langsning has long carried a deeper role:
              nurturing local talent, representing the Khasi community on bigger
              stages, and giving Meghalaya football a name that reached national
              competitions. The club's journey from community pitches in Jaiaw
              Langsning to matches on the national stage reflects the broader
              story of football's growth in Northeast India, driven not by big
              budgets, but by loyalty, identity and the people who never stopped
              showing up.
            </p>

            <p>
              This page exists to preserve that story. What follows is the
              club's timeline and honours — the seasons, the titles, and the
              moments that built the legacy of Langsning FC.
            </p>

          </div>

        </div>
      </section>

      <ClubPerformance />

      <Footer />
    </main>
  );
}
