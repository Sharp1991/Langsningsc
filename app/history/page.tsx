import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import AboutClub from "@/components/AboutClub";
import Timeline from "@/components/Timeline";
import Honours from "@/components/Honours";
import Footer from "@/components/Footer";

export default function HistoryPage() {
  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <AboutClub />
        <Timeline />
        <Honours />
      </main>

      <Footer />
    </>
  );
}
