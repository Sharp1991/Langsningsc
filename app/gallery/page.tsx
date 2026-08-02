import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Gallery() {
  return (
    <main className="bg-black pt-16 md:pt-20">
      <Navbar />

      <section className="bg-[#faf8f4] py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">Gallery</p>
          <h2 className="mt-4 text-4xl font-semibold">Coming Soon</h2>
          <p className="mt-6 text-lg text-gray-600">
            Match photos, fan moments and club memories are on their way.
            Check back soon.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
