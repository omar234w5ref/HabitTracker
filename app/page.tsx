"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "./lib/supabase";

export default function LandingPage() {
  const [showPricing, setShowPricing] = useState(false);

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/tracker`,
      },
    });

    if (error) console.error("Google login error:", error);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#F6FBF4] text-[#1F3A2E]">
      {/* Navbar */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-black text-[#1F3A2E]"
        >
          <span className="text-2xl">🌱</span>
          <span>CharacterArc</span>
        </Link>

        <nav className="hidden items-center gap-10 text-sm font-semibold md:flex">
          <button
            onClick={() => setShowPricing(true)}
            className="transition hover:text-[#6BAA75]"
          >
            Pricing
          </button>

          <a
            href="#how-it-works"
            className="transition hover:text-[#6BAA75]"
          >
            How it works
          </a>
        </nav>

        <button
          onClick={signInWithGoogle}
          className="rounded-full bg-[#7BC47F] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:scale-105 hover:bg-[#68b06c]"
        >
          Get Started
        </button>
      </header>

      {/* Pricing Modal */}
      {showPricing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F3A2E]/30 px-6">
          <div className="relative w-full max-w-md rounded-3xl border border-[#DDEBDD] bg-[#F9FFF8] p-8 text-center shadow-2xl">
            <button
              onClick={() => setShowPricing(false)}
              className="absolute right-5 top-4 text-2xl font-bold text-[#5F7A6B] hover:text-[#1F3A2E]"
            >
              ×
            </button>

            <h2 className="text-4xl font-black text-[#1F3A2E]">
              It’s free.
            </h2>

            <p className="mt-4 text-lg text-[#5F7A6B]">
              No subscriptions. No trial. No weird premium morality package.
            </p>

            <button
              onClick={() => setShowPricing(false)}
              className="mt-8 rounded-full bg-[#7BC47F] px-8 py-3 font-bold text-white transition hover:bg-[#68b06c]"
            >
              Nice
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative mx-auto flex min-h-[80vh] max-w-7xl items-center px-6 py-20">
        {/* Main hero content */}
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-6 text-sm font-semibold tracking-wide text-[#6BAA75]">
            Track your character in real life
          </p>

          <h1 className="text-5xl font-black leading-tight tracking-tight text-[#1F3A2E] md:text-7xl">
            Become a better person,
            <br />
            one action at a time
          </h1>


          <p className="mx-auto mt-10 max-w-2xl text-lg leading-8 text-[#5F7A6B]">
            A simple real-life character tracker for the tiny choices that shape
            who you become. Log good actions, bad actions, and watch your daily
            score reflect the person you're becoming.
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
  onClick={signInWithGoogle}
  className="cursor-pointer rounded-full bg-[#7BC47F] px-12 py-4 font-black text-white shadow-lg transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:bg-[#68b06c] hover:shadow-xl active:scale-95"
>
  Start tracking →
</button>

            <a
              href="#how-it-works"
              className="rounded-full border-2 border-[#7BC47F] px-10 py-4 font-bold text-[#1F3A2E] transition hover:bg-[#7BC47F] hover:text-white"
            >
              How it works
            </a>
          </div>

          <div className="mx-auto mt-14 w-fit rounded-full border border-[#DDEBDD] bg-[#E8F5E9] px-6 py-4 text-left shadow-sm">
            <p className="font-black text-[#1F3A2E]">
              “Small actions. Real progress.”
            </p>
            <p className="text-sm text-[#5F7A6B]">
              — someone trying to improve
            </p>
          </div>
        </div>


        {/* Before/After emoji */}
<div className="absolute right-10 top-1/2 hidden -translate-y-1/2 xl:block group">
  <div className="flex flex-col items-center">
    
    {/* Emoji */}
    <div className="text-7xl transition-all duration-300 group-hover:scale-125">
      <span className="group-hover:hidden">😠</span>
      <span className="hidden group-hover:inline">😄</span>
    </div>

    {/* Text */}
    <p className="mt-4 text-lg font-bold text-[#5F7A6B] transition-all duration-300 group-hover:scale-125 group-hover:text-[#6BAA75]">
      <span className="group-hover:hidden">Before</span>
      <span className="hidden group-hover:inline">After</span>
    </p>
  </div>
        </div>
        {/* Heart hover effect */}
<div className="absolute left-10 top-1/2 hidden -translate-y-1/2 xl:block group">
  <div className="flex flex-col items-center rotate-12">
    
    {/* Heart */}
    <div className="text-7xl transition-all duration-300 group-hover:scale-125">
      <span className="group-hover:hidden">🖤</span>
      <span className="hidden group-hover:inline">❤️</span>
    </div>

    {/* Text */}
    <p className="mt-4 text-lg font-bold text-[#5F7A6B] transition-all duration-300 group-hover:scale-125 group-hover:text-red-500">
      <span className="group-hover:hidden">Cold</span>
      <span className="hidden group-hover:inline">Healing</span>
    </p>
  </div>
</div>

      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 pb-24">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {[
            [
              "1. Add actions",
              "Log the good, bad, awkward, and surprisingly decent things you do.",
            ],
            [
              "2. Watch your score",
              "Your daily character meter moves based on your choices.",
            ],
            [
              "3. Review your arc",
              "Use your history to see whether you're actually improving.",
            ],
          ].map(([title, text]) => (
            <div
              key={title}
              className="rounded-3xl border border-[#DDEBDD] bg-white p-8 text-[#1F3A2E] shadow-xl"
            >
              <h2 className="text-xl font-black">{title}</h2>
              <p className="mt-4 leading-7 text-[#5F7A6B]">{text}</p>
            </div>
          ))}
        </div>
      </section>

{/* Why people fail section */}
<section className="mx-6 mb-16 rounded-[40px] bg-[#2F1B16] px-6 py-24 text-center text-[#FDE8C8] md:px-12">
  <div className="mx-auto max-w-4xl">
    <h2 className="text-4xl font-black leading-tight md:text-6xl">
      People want to change.
      <br />
      After a few days...
      <br />
      they forget.
    </h2>

    <p className="mx-auto mt-8 max-w-2xl text-lg text-[#D9B89C]">
      Motivation fades fast. Most people start strong, lose awareness,
      fall back into old habits, and end up exactly where they started.
    </p>
  </div>

  <div className="mt-20 flex flex-col items-center justify-center gap-10 md:flex-row md:gap-16">
    
    {/* Step 1 */}
    <div className="flex flex-col items-center">
      <div className="text-6xl">😤</div>
      <p className="mt-4 max-w-[180px] font-bold">
        Feels motivated to improve
      </p>
    </div>

    {/* Arrow */}
    <div className="hidden text-4xl md:block">
      →
    </div>

    {/* Step 2 */}
    <div className="flex flex-col items-center">
      <div className="text-6xl">😴</div>
      <p className="mt-4 max-w-[180px] font-bold">
        Forgets after a few days
      </p>
    </div>

    {/* Arrow */}
    <div className="hidden text-4xl md:block">
      →
    </div>

    {/* Step 3 */}
    <div className="flex flex-col items-center">
      <div className="text-6xl">😬</div>
      <p className="mt-4 max-w-[180px] font-bold">
        Ends up back where they started
      </p>
    </div>
  </div>
</section>
    </main>
  );
}