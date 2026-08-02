export default function Footer() {
  return (
    <footer className="bg-gray-950 py-12 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-2xl font-bold">
              We Are Langsning
            </h3>

            <p className="mt-4 text-gray-400">
              An unofficial fan website celebrating Langsning Football
              Club, its history, players, and supporters.
            </p>
          </div>

          <div>
            <h4 className="font-semibold uppercase tracking-wider">
              Explore
            </h4>

            <ul className="mt-4 space-y-2 text-gray-400">
              <li>History</li>
              <li>Honours</li>
              <li>Timeline</li>
              <li>Fan Zone</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold uppercase tracking-wider">
              Disclaimer
            </h4>

            <p className="mt-4 text-gray-400">
              This is an unofficial supporter project and is not
              affiliated with Langsning FC or any football association.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-800 pt-6 text-sm text-gray-500">
          © {new Date().getFullYear()} We Are Langsning. Built by fans.
        </div>
      </div>
    </footer>
  );
}
