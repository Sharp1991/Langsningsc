import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import AboutClub from "@/components/AboutClub";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="bg-black">
      <Navbar />
      <Hero />
      <AboutClub />
      <Footer />
    </main>
  );
}
