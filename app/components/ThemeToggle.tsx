"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("characterarc-theme");
    const shouldUseDark =
      savedTheme === "dark" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);

    document.documentElement.classList.toggle("dark-screen", shouldUseDark);
    const frame = window.requestAnimationFrame(() => setIsDark(shouldUseDark));

    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggleTheme() {
    const nextIsDark = !isDark;

    document.documentElement.classList.toggle("dark-screen", nextIsDark);
    window.localStorage.setItem(
      "characterarc-theme",
      nextIsDark ? "dark" : "light"
    );
    setIsDark(nextIsDark);
  }

  return (
    <button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed bottom-5 right-5 z-[80] grid h-12 w-12 place-items-center rounded-full border border-[#f0ded0] bg-white/88 text-[#171c2d] shadow-[0_16px_36px_rgba(102,77,54,0.18)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-[#fff4e8]"
      onClick={toggleTheme}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
