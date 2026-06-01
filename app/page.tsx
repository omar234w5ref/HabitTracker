"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import Lenis from "@studio-freight/lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  CalendarDays,
  Heart,
  Lock,
  Sparkles,
  Sprout,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TRACKER_ACTIONS, clamp } from "./lib/characterArc";
import { supabase } from "./lib/supabase";

const problemSteps = [
  {
    title: "Set a goal",
    text: "I want to be kinder, calmer, and more disciplined.",
    color: "#dcecdf",
  },
  {
    title: "Try your best",
    text: "You read advice, promise to change, then the day gets loud.",
    color: "#ffe0d7",
  },
  {
    title: "But growth feels invisible",
    text: "Without feedback, small wins are easy to forget.",
    color: "#e8dcfb",
  },
];

const features = [
  {
    eyebrow: "Action tracking",
    title: "Turn daily choices into clear progress",
    text: "Log kind actions, compliments, mistakes, and reflections. CharacterArc turns those moments into a simple score you can understand at a glance.",
    cta: "Start tracking",
    image: {
      src: "/landing-growth-1.png",
      alt: "Daily score dashboard with quick action buttons",
      width: 911,
      height: 408,
      frame: "min-h-[260px] sm:min-h-[360px]",
      wrap: "max-w-[940px]",
      sizes: "(min-width: 1024px) 47vw, 92vw",
    },
  },
  {
    eyebrow: "Progress view",
    title: "Watch your traits grow over time",
    text: "Kindness, confidence, and discipline become visible. The tracker and stats pages show what is improving and what needs attention.",
    cta: "See my growth",
    image: {
      src: "/landing-growth-2.png",
      alt: "Traits panel showing kindness, confidence, and discipline levels",
      width: 340,
      height: 402,
      frame: "min-h-[460px]",
      wrap: "max-w-[340px]",
      sizes: "(min-width: 1024px) 340px, 82vw",
    },
  },
  {
    eyebrow: "Reflection loop",
    title: "Reflect, adjust, and try again tomorrow",
    text: "A private reflection space helps you understand what happened, save the lesson, and return with a little more clarity.",
    cta: "Build the habit",
    image: {
      src: "/landing-growth-3.png",
      alt: "Progress chart showing personality growth over time",
      width: 998,
      height: 617,
      frame: "min-h-[340px] sm:min-h-[460px]",
      wrap: "max-w-[920px]",
      sizes: "(min-width: 1024px) 47vw, 92vw",
    },
  },
];

const trustItems = [
  {
    title: "Private by default",
    text: "Your notes and actions stay connected to your own account.",
    icon: Lock,
  },
  {
    title: "Built for self-reflection",
    text: "No judgment, no noise. Just a gentle feedback loop.",
    icon: Heart,
  },
  {
    title: "Made for momentum",
    text: "Small actions become visible enough to keep going.",
    icon: Trophy,
  },
];

const quickActions = TRACKER_ACTIONS;

const quickActionStyles: Record<
  (typeof TRACKER_ACTIONS)[number]["tone"],
  { background: string; bar: string; icon: string }
> = {
  kindness: {
    background: "#dcecdf",
    bar: "#5f9672",
    icon: "#dff0de",
  },
  confidence: {
    background: "#e8dcfb",
    bar: "#8a5de8",
    icon: "#ede2ff",
  },
  warning: {
    background: "#ffde82",
    bar: "#d99a00",
    icon: "#fff1c2",
  },
  negative: {
    background: "#ffb4a6",
    bar: "#e15d52",
    icon: "#ffe0d7",
  },
};

const confettiPieces = [
  { left: "12%", top: "34%", color: "#5f9672", tx: "-44px", ty: "-70px" },
  { left: "24%", top: "30%", color: "#ffb4a6", tx: "-24px", ty: "-86px" },
  { left: "40%", top: "34%", color: "#f5bd00", tx: "-8px", ty: "-76px" },
  { left: "55%", top: "30%", color: "#8a5de8", tx: "18px", ty: "-88px" },
  { left: "70%", top: "35%", color: "#5f9672", tx: "36px", ty: "-76px" },
  { left: "84%", top: "38%", color: "#ff8c83", tx: "48px", ty: "-62px" },
  { left: "30%", top: "56%", color: "#5f9672", tx: "-34px", ty: "-48px" },
  { left: "62%", top: "58%", color: "#f5bd00", tx: "34px", ty: "-46px" },
];

function QuickActionDemo() {
  const [progress, setProgress] = useState(32);
  const [actionIndex, setActionIndex] = useState(1);
  const [burstKey, setBurstKey] = useState(0);
  const [lastAction, setLastAction] = useState("Pick an action");
  const actionSoundRef = useRef<HTMLAudioElement | null>(null);
  const currentAction = quickActions[actionIndex];
  const currentStyle = quickActionStyles[currentAction.tone];
  const amountLabel =
    currentAction.amount > 0
      ? `+${currentAction.amount}`
      : `${currentAction.amount}`;

  useEffect(() => {
    actionSoundRef.current = new Audio("/click.wav");
    actionSoundRef.current.volume = 0.45;
  }, []);

  function logAction() {
    if (actionSoundRef.current) {
      actionSoundRef.current.pause();
      actionSoundRef.current.currentTime = 0;

      void actionSoundRef.current.play().catch((error) => {
        console.error("Demo sound play error:", error);
      });
    }

    setProgress((current) => clamp(current + currentAction.amount, 0, 100));
    setLastAction(currentAction.label);
    setActionIndex((current) => (current + 1) % quickActions.length);
    setBurstKey((current) => current + 1);
  }

  return (
    <motion.div
      className="relative mx-auto w-full max-w-[340px] text-left"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.65, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-visible">
        {confettiPieces.map((piece, index) => (
          <span
            key={`${burstKey}-${index}`}
            className="confetti-pop absolute h-2.5 w-2 rounded-full opacity-0"
            style={
              {
                left: piece.left,
                top: piece.top,
                backgroundColor: piece.color,
                "--confetti-x": piece.tx,
                "--confetti-y": piece.ty,
                animationDelay: `${index * 22}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>

            <h2 className="landing-demo-heading mt-3 text-3xl font-black leading-tight text-[#171c2d]">
              Log a good action
            </h2>
          </div>
          <div
            className="mt-3 grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[#5f9672]"
            style={{ backgroundColor: currentStyle.icon }}
          >
            <Sprout size={22} />
          </div>
        </div>

        <div className="mt-8 grid gap-3">
          <button
            key={currentAction.label}
            className="landing-action-pill flex min-h-14 w-full items-center justify-between rounded-full px-5 text-base font-black text-[#171c2d] shadow-[inset_0_-10px_18px_rgba(150,116,235,0.08)] transition hover:-translate-y-0.5 hover:shadow-sm"
            onClick={logAction}
            style={{ backgroundColor: currentStyle.background }}
          >
            <span>{currentAction.label}</span>
            <span className="rounded-full bg-white/75 px-3 py-1 text-sm">
              {amountLabel}
            </span>
          </button>
        </div>

        <div className="mt-16">
          <div className="landing-demo-meta flex items-center justify-between text-sm font-black text-[#4d596b]">
            <span>{lastAction}</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-4 h-4 overflow-hidden rounded-full bg-[#f1e7dc]">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, backgroundColor: currentStyle.bar }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/tracker`,
      },
    });

    if (error) console.error("Google login error:", error);
  }

  useEffect(() => {
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 0.95,
      easing: (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
    });
    let frame = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };

    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.fromTo(
          element,
          { autoAlpha: 0, y: 34 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.75,
            ease: "power3.out",
            scrollTrigger: { trigger: element, start: "top 84%" },
          }
        );
      });
    });

    return () => context.revert();
  }, [prefersReducedMotion]);

  return (
    <motion.main
      className="landing-page min-h-screen overflow-hidden bg-[#fff8ee] text-[#171c2d]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <header className="mx-auto flex max-w-[1380px] items-center justify-between px-6 py-8">
        <Link href="/" className="flex items-center gap-3 text-lg font-black">
          <Image
            src="/characterarc-icon.png"
            alt="CharacterArc"
            width={38}
            height={38}
            className="rounded-xl shadow-sm"
            priority
          />
          <span>CA</span>
        </Link>



        <div className="flex items-center gap-5">
          <button
            onClick={signInWithGoogle}
            className="landing-demo-meta hidden text-sm font-bold text-[#3d4556] transition hover:text-[#5f9672] sm:block"
          >
            Log in
          </button>
          <button
            onClick={signInWithGoogle}
            className="rounded-full bg-[#5f9672] px-7 py-4 text-sm font-black text-white shadow-[0_18px_34px_rgba(95,150,114,0.22)] transition hover:-translate-y-0.5 hover:bg-[#4f8763]"
          >
            Get started
          </button>
        </div>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-112px)] max-w-[1380px] items-center gap-14 px-6 pb-24 pt-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:pb-28 lg:pt-8">
        <div className="text-left">
          <motion.div
            className="landing-chip inline-flex items-center gap-2 rounded-full border border-[#f0ded0] bg-white/74 px-4 py-2 text-sm font-black text-[#5f9672] shadow-[0_8px_18px_rgba(102,77,54,0.08)]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <Sparkles size={16} />
            A gentle tracker for becoming who you want to be
          </motion.div>

          <motion.h1
            className="landing-title mt-10 max-w-[760px] text-[4.5rem] font-black leading-[1.02] tracking-normal text-[#172239] md:text-[6.4rem] lg:text-[6.8rem]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          >
            Become a
            <br />
            better person
            <br />
            with small actions
          </motion.h1>

          <motion.p
            className="landing-muted mt-9 max-w-[660px] text-2xl font-semibold leading-[1.55] text-[#5c6b80]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
          >
            Every small action counts. track and save them to reach your
            destination of becoming a better person .
          </motion.p>

          <motion.div
            className="mt-11 flex flex-col gap-5 sm:flex-row sm:items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22 }}
          >
            <button
              onClick={signInWithGoogle}
              className="inline-flex items-center justify-center gap-4 rounded-full bg-[#5f9672] px-9 py-5 text-base font-black text-white shadow-[0_18px_34px_rgba(95,150,114,0.25)] transition hover:-translate-y-0.5 hover:bg-[#4f8763]"
            >
              Grow my character
              <ArrowRight size={18} />
            </button>
            <a
              href="#how-it-works"
              className="landing-green-text inline-flex items-center justify-center rounded-full px-7 py-5 text-base font-black text-[#5f9672] transition hover:bg-[#eef7ee]"
            >
              See how it works
            </a>
          </motion.div>
        </div>

        <div className="lg:self-start lg:pt-[120px]">
          <QuickActionDemo />
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-[1500px] px-6 py-20">
        <div data-reveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black text-[#7a8190]">
            Building lasting change is hard
          </p>
          <h2 className="mt-4 text-5xl font-black tracking-tight md:text-6xl">
            Good intentions need feedback
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {problemSteps.map((step, index) => (
            <article
              key={step.title}
              data-reveal
              className="rounded-[22px] border border-[#f0ded0] bg-white/78 p-7 shadow-[0_18px_50px_rgba(102,77,54,0.10)]"
            >
              <div
                className="grid h-14 w-14 place-items-center rounded-2xl text-xl font-black"
                style={{ backgroundColor: step.color }}
              >
                {index + 1}
              </div>
              <h3 className="mt-7 text-2xl font-black">{step.title}</h3>
              <p className="mt-4 text-base font-semibold leading-7 text-[#5c6472]">
                {step.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1500px] px-6 py-20">
        <div data-reveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black text-[#7a8190]">
            Character growth made simple
          </p>
          <h2 className="mt-4 text-5xl font-black tracking-tight md:text-6xl">
            Small actions, automatic insight
          </h2>
        </div>

        <div className="mt-16 space-y-20">
          {features.map(({ eyebrow, title, text, cta, image }, index) => (
            <article
              key={title}
              data-reveal
              className="grid items-center gap-10 lg:grid-cols-2"
            >
              <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                <p className="text-sm font-black text-[#5f9672]">{eyebrow}</p>
                <h3 className="mt-4 max-w-xl text-4xl font-black leading-[1.08] tracking-tight md:text-5xl">
                  {title}
                </h3>
                <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-[#5c6472]">
                  {text}
                </p>
                <button
                  onClick={signInWithGoogle}
                  className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#5f9672] px-7 py-4 text-sm font-black text-white shadow-[0_18px_34px_rgba(95,150,114,0.22)] transition hover:-translate-y-0.5 hover:bg-[#4f8763]"
                >
                  {cta}
                  <ArrowRight size={17} />
                </button>
              </div>

              <div
                className={`relative flex items-center justify-center overflow-hidden rounded-[30px] border border-[#f0ded0] p-4 shadow-[0_24px_70px_rgba(102,77,54,0.10)] sm:p-8 ${image.frame} ${
                  index === 0
                    ? "bg-[#fff6ec]"
                    : index === 1
                    ? "bg-[#eef7ee]"
                    : "bg-[#f7efff]"
                }`}
              >
                <div
                  className={`relative z-10 w-full overflow-hidden rounded-[22px] border border-[#f0ded0] bg-white shadow-[0_18px_50px_rgba(102,77,54,0.12)] ${image.wrap}`}
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    sizes={image.sizes}
                    className="h-auto w-full object-contain"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="mx-auto max-w-[1500px] px-6 py-20">
        <div data-reveal className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black text-[#7a8190]">
              Made with care
            </p>
            <h2 className="mt-4 max-w-xl text-5xl font-black leading-[1.1] tracking-tight md:text-6xl">
              A private place to notice your growth
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {trustItems.map(({ title, text, icon: Icon }) => (
              <article
                key={title}
                className="rounded-[22px] border border-[#f0ded0] bg-white/78 p-6 shadow-[0_18px_50px_rgba(102,77,54,0.10)]"
              >
                <div className="grid h-12 w-12 place-items-center rounded-[18px] bg-[#eef7ee] text-[#5f9672]">
                  <Icon size={21} />
                </div>
                <h3 className="mt-6 text-lg font-black">{title}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#5c6472]">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-6 py-16">
        <div
          data-reveal
          className="relative overflow-hidden rounded-[30px] border border-[#f1dccc] bg-[#fff6ec] px-8 py-14 text-center shadow-[0_24px_70px_rgba(102,77,54,0.10)] md:px-24"
        >
          <div className="absolute -left-10 top-8 h-40 w-40 rounded-full bg-[#ffd3b3]" />
          <div className="absolute -right-12 bottom-0 h-48 w-48 rounded-full bg-[#ffb4a6]" />
          <div className="relative z-10 mx-auto max-w-3xl">
            <CalendarDays className="mx-auto text-[#5f9672]" size={36} />
            <h2 className="mt-6 text-4xl font-black tracking-tight md:text-5xl">
              Start with one tiny action today
            </h2>
            <p className="mt-6 text-base font-semibold leading-8 text-[#5c6472]">
              Track what happened, reflect on it, and come back tomorrow with a
              clearer view of yourself.
            </p>
            <button
              onClick={signInWithGoogle}
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#5f9672] px-8 py-5 text-sm font-black text-white shadow-[0_18px_34px_rgba(95,150,114,0.22)] transition hover:-translate-y-0.5 hover:bg-[#4f8763]"
            >
              Get started for free
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </motion.main>
  );
}
