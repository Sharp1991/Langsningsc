export const dynamic = "force-dynamic";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import NextMatch from "@/components/NextMatch";
import LatestStories from "@/components/LatestStories";
import AboutClub from "@/components/AboutClub";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data: articles, error } = await supabase
    .from("articles")
    .select(
      "id, title, image_url, slug, excerpt, category, published_date"
    )
    .order("id", { ascending: false })
    .limit(4);

  if (error) {
    console.error("HERO ARTICLES ERROR:", error);
  }

  return (
    <main className="bg-black">
      <Navbar />

      <Hero articles={articles || []} />

      <NextMatch />

      <LatestStories />

      <AboutClub />

      <Footer />
    </main>
  );
}
