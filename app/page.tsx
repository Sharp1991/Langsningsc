import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import NextMatch from "@/components/NextMatch";
import LatestStories from "@/components/LatestStories";
import AboutClub from "@/components/AboutClub";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="bg-black">
      <Navbar />

      <Hero />

      <NextMatch />

      <LatestStories />

      <AboutClub />

      <Footer />
    </main>
  );
}
