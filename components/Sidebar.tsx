export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 bg-black lg:flex flex-col items-center py-10">

      <img
        src="/logo.png"
        alt="Langsning FC"
        className="w-24 h-24 object-contain"
      />

      <h2 className="mt-5 text-xl font-bold text-white">
        LANGSNING FC
      </h2>

      <p className="text-sm text-red-500 uppercase tracking-[0.3em]">
        Fan Hub
      </p>

      <nav className="mt-16 flex flex-col gap-6 text-center uppercase tracking-widest text-sm">

        <a href="#" className="text-red-500 font-semibold">
          Home
        </a>

        <a href="#" className="text-white hover:text-red-500">
          History
        </a>

        <a href="#" className="text-white hover:text-red-500">
          Matches
        </a>

        <a href="#" className="text-white hover:text-red-500">
          Players
        </a>

        <a href="#" className="text-white hover:text-red-500">
          Gallery
        </a>

        <a href="#" className="text-white hover:text-red-500">
          Honours
        </a>

      </nav>

      <div className="mt-auto text-gray-500 text-xs">
        © 2026
      </div>

    </aside>
  );
}
