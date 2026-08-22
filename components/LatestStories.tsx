import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function LatestStories() {
  const { data: articles, error } = await supabase
    .from("articles")
    .select(
      "id, title, image_url, slug, excerpt, category, published_date"
    )
    .order("id", { ascending: false })
    .limit(4);

  if (error) {
    console.error("LATEST STORIES ERROR:", error);

    return (
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-black">
            Latest Stories
          </h2>

          <p className="mt-4 text-red-600">
            Supabase error: {error.message}
          </p>
        </div>
      </section>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-black">
            Latest Stories
          </h2>

          <p className="mt-4 text-red-600">
            No articles returned from Supabase.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#faf8f4] px-6 py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#c8102e]">
              Langsning FC
            </p>

            <h2
              className="mt-2 text-3xl font-bold text-[#1c1817] md:text-4xl"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Latest Stories
            </h2>
          </div>

          <Link
            href="/articles"
            className="text-xs font-medium uppercase tracking-wider text-[#83766c] hover:text-[#c8102e]"
          >
            View all →
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug || article.id}`}
              className="group overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="aspect-[16/10] overflow-hidden bg-[#e9e4da]">
                {article.image_url ? (
                  <img
                    src={article.image_url}
                    alt={article.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#83766c]">
                    Langsning FC
                  </div>
                )}
              </div>

              <div className="p-5">
                {article.category && (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c8102e]">
                    {article.category}
                  </p>
                )}

                <h3
                  className="mt-2 text-xl font-bold leading-tight text-[#1c1817]"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {article.title}
                </h3>

                {article.excerpt && (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#83766c]">
                    {article.excerpt}
                  </p>
                )}

                <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[#c8102e]">
                  Read story →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
