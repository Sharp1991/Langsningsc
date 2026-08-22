import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Article = {
  id: number;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  category: string | null;
  published_at: string | null;
  published_date: string | null;
  source: string | null;
};

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: article, error } = await supabase
    .from("articles")
    .select(
      "id, title, slug, excerpt, content, image_url, category, published_at, published_date, source"
    )
    .eq("slug", slug)
    .single();

  if (error || !article) {
    notFound();
  }

  const date = article.published_date || article.published_at;

  return (
    <main className="min-h-screen bg-[#faf8f4]">
      {/* HEADER */}
      <header className="border-b border-black/10 bg-black px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            href="/"
            className="text-sm font-bold uppercase tracking-[0.2em] text-white"
          >
            LANGSNING FC
          </Link>

          <Link
            href="/"
            className="text-xs uppercase tracking-wider text-white/70 hover:text-white"
          >
            ← Back Home
          </Link>
        </div>
      </header>

      {/* ARTICLE */}
      <article className="mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-20">
        {/* CATEGORY */}
        {article.category && (
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#c8102e]">
            {article.category}
          </p>
        )}

        {/* TITLE */}
        <h1
          className="mt-4 max-w-4xl text-4xl font-bold leading-tight text-[#1c1817] md:text-6xl"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {article.title}
        </h1>

        {/* DATE / SOURCE */}
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-[#83766c]">
          {date && (
            <span>
              {new Date(date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          )}

          {article.source && (
            <>
              <span>•</span>
              <span>{article.source}</span>
            </>
          )}
        </div>

        {/* FEATURE IMAGE */}
        {article.image_url && (
          <div className="mt-10 overflow-hidden rounded-xl">
            <img
              src={article.image_url}
              alt={article.title}
              className="h-auto w-full object-cover"
            />
          </div>
        )}

        {/* EXCERPT */}
        {article.excerpt && (
          <p className="mt-10 text-xl font-medium leading-8 text-[#4d4540] md:text-2xl md:leading-9">
            {article.excerpt}
          </p>
        )}

        {/* CONTENT */}
        {article.content && (
          <div className="mt-10 max-w-3xl">
            <div className="whitespace-pre-line text-base leading-8 text-[#302b28] md:text-lg md:leading-9">
              {article.content}
            </div>
          </div>
        )}

        {/* BACK */}
        <div className="mt-14 border-t border-black/10 pt-8">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c8102e] hover:underline"
          >
            ← Back to Langsning FC
          </Link>
        </div>
      </article>
    </main>
  );
}
