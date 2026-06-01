import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

export const metadata: Metadata = {
  title: "Impressum | CharacterArc",
  description: "Impressum von CharacterArc.",
};

export default function ImpressumPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff8ee] px-6 py-8 text-[#171c2d]">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-40 rounded-[60%_40%_55%_45%/45%_58%_42%_55%] bg-[#ffd9bf]" />
      <div className="pointer-events-none absolute -right-20 top-0 h-80 w-48 rounded-[45%_55%_51%_49%/50%_55%_45%_50%] bg-[#ffd6b2]" />
      <div className="pointer-events-none absolute -bottom-10 left-4 h-56 w-80 rounded-[60%_40%_42%_58%/58%_45%_55%_42%] bg-[#ffd9bf]" />
      <div className="pointer-events-none absolute -bottom-16 -right-14 h-40 w-44 rounded-[48%_52%_46%_54%/48%_53%_47%_52%] bg-[#ff9c8c]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1100px] flex-col">
        <header className="flex items-center justify-between py-4">
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

          <Link
            href="/tracker"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#f0ded0] bg-white/90 text-[#171c2d] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff4e8]"
            aria-label="Tracker"
            title="Tracker"
          >
            <ClipboardList size={21} strokeWidth={2.4} />
          </Link>
        </header>

        <section className="my-auto py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-black text-[#7a8190]">
              Rechtliches
            </p>
            <h1 className="mt-4 text-5xl font-black tracking-tight md:text-6xl">
              Impressum
            </h1>

            <div className="mt-10 space-y-8 rounded-[22px] border border-[#f0ded0] bg-white/82 p-8 text-base font-semibold leading-8 text-[#3d4556] shadow-[0_24px_70px_rgba(102,77,54,0.10)] backdrop-blur md:p-10">
              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  Angaben gemäß § 5 TDDDG
                </h2>
                <p className="mt-4">
                  Omar Mellaaref
                  <br />
                  Einzelunternehmer
                  <br />
                  Kielerstraße 247
                  <br />
                  24536 Neumünster
                  <br />
                  Deutschland
                  <br />
                  E-Mail:{" "}
                  <a
                    className="font-black text-[#5f9672] hover:underline"
                    href="mailto:mellaomar00@gmail.com"
                  >
                    mellaomar00@gmail.com
                  </a>
                  <br />
                  Website: [deinedomain.de]
                </p>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:
                </h2>
                <p className="mt-4">
                  Omar Mellaaref
                  <br />
                  Kielerstraße 247
                  <br />
                  24536 Neumünster
                  <br />
                  Deutschland
                </p>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  Hinweis gemäß § 36 VSBG:
                </h2>
                <p className="mt-4">
                  Wir sind nicht verpflichtet und nicht bereit, an
                  Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
                  teilzunehmen.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  Plattform der EU-Kommission zur Online-Streitbeilegung:
                </h2>
                <p className="mt-4">
                  <a
                    className="font-black text-[#5f9672] hover:underline"
                    href="https://ec.europa.eu/consumers/odr/"
                    rel="noreferrer"
                    target="_blank"
                  >
                    https://ec.europa.eu/consumers/odr/
                  </a>
                </p>
              </section>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
