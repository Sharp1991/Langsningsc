import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#faf8f4] flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <p className="mono text-xs tracking-[0.25em] text-[#c8102e] mb-4">
          LANGSNING FC
        </p>

        <h1 className="text-7xl font-semibold text-[#1c1817] mb-4">
          404
        </h1>

        <h2 className="text-2xl font-semibold text-[#1c1817] mb-3">
          Page not found
        </h2>

        <p className="text-[#83766c] mb-8">
          The page you’re looking for doesn’t exist or may have moved.
        </p>

        <Link
          href="/"
          className="inline-block bg-[#c8102e] text-white px-6 py-3 text-sm font-semibold hover:bg-[#8c0d21] transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
