"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "#", label: "History" },
  { href: "#", label: "Matches" },
  { href: "#", label: "Players" },
  { href: "#", label: "Gallery" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 z-50 w-full bg-black/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 md:h-20 max-w-7xl items-center justify-between px-4 md:px-6">

        <Link href="/" className="flex items-center gap-2 md:gap-3">
          <Image
            src="/logo.png"
            alt="Langsning FC"
            width={40}
            height={40}
            priority
            className="h-9 w-9 md:h-[50px] md:w-[50px]"
          />
          <div>
            <h2 className="text-sm md:text-lg font-bold text-white leading-tight">
              LANGSNING FC
            </h2>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-red-500">
              Fan Hub
            </p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-10">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-white hover:text-red-500 transition"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setOpen(!open)}
          className="text-3xl text-white md:hidden"
          aria-label="Toggle menu"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 bg-black px-4 pb-4 md:hidden">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="py-3 border-b border-white/10 text-white hover:text-red-500 transition"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
