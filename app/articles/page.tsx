import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

type Article = {
  id: number;
  title: string;
  slug: string | null;
  excerpt: string | null;
  category: string | null;
  published_date: string | null;
  image_url: string | null;
};

export default async function ArticlesPage() {
  const { data: articles, error } = await supabase
    .from("articles")
    .select(
      "id, title, slug, excerpt, category, published_date, image_url"
    )
    .order("published_date", { ascending: false });

  if (error) {
    console.error("ARTICLES PAGE ERROR:", error);
  }

  return (
    <main className="min-h-screen bg-[#faf8f4] text-[#1c1817]">
      <Navbar />

      {/* HEADER */}
      <section className="border-b border-[#1c1817]/10 px-6 pb-12 pt-32">
        <div className="mx-auto max-w-6xl">
          <p className="mono text-xs uppercase tracking-[0.3em] text-[#c8102e]">
            Langsning FC
          </p>

          <h1
            className="mt-3 text-5xl font-semibold md:text-6xl"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            All Stories
          </h1>

          <p className="mt-4 max-w-xl text-[#83766c]">
            News, match reports, features and stories from the Langsning FC
            community.
          </p>
        </div>
      </section>

      {/* ARTICLES */}
      <section className="px-6 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          {!articles || articles.length === 0 ? (
            <div className="rounded-lg border border-[#1c1817]/10 bg-white p-12 text-center">
              <p className="mono text-xs uppercase tracking-[0.2em] text-[#83766c]">
                No articles available
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.slug || article.id}`}
                  className="group overflow-hidden rounded-lg border border-[#1c1817]/10 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* IMAGE */}
                  <div className="aspect-[16/10] overflow-hidden bg-[#e9e4da]">
                    {article.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="mono text-[10px] uppercase tracking-[0.2em] text-[#83766c]">
                          Langsning FC
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CONTENT */}
                  <div className="p-6">
                    <div className="flex items-center gap-2">
                      {article.category && (
                        <span className="mono text-[9px] uppercase tracking-[0.15em] text-[#c8102e]">
                          {article.category}
                        </span>
                      )}

                      {article.published_date && (
                        <>
                          <span className="text-[#83766c]/40">•</span>

                          <span className="mono text-[9px] text-[#83766c]">
                            {new Date(
                              article.published_date
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </>
                      )}
                    </div>

                    <h2
                      className="mt-3 text-2xl font-semibold leading-tight text-[#1c1817]"
                      style={{ fontFamily: "'Fraunces', serif" }}
                    >
                      {article.title}
                    </h2>

                    {article.excerpt && (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#83766c]">
                        {article.excerpt}
                      </p>
                    )}

                    <p className="mono mt-5 text-[10px] uppercase tracking-[0.15em] text-[#c8102e]">
                      Read story →
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
