import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen | CharacterArc",
  description: "Nutzungsbedingungen von CharacterArc.",
};

const accountResponsibilities = [
  "die Sicherheit deiner Zugangsdaten",
  "alle Aktivitäten unter deinem Account",
];

const prohibitedUses = [
  "die App für illegale Zwecke zu nutzen",
  "Sicherheitsmechanismen zu umgehen",
  "die App zu manipulieren",
  "andere Nutzer zu schädigen",
  "automatisierte Angriffe oder Missbrauch durchzuführen",
];

const liabilityLimits = [
  "individuelle Entscheidungen von Nutzern",
  "persönliche Handlungen außerhalb der App",
  "indirekte Schäden",
  "Datenverluste durch technische Probleme",
];

export default function TermsPage() {
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

        <section className="py-16">
          <div className="max-w-4xl">
            <p className="text-sm font-black text-[#7a8190]">
              Letzte Aktualisierung: 17.05.2026
            </p>
            <h1 className="mt-4 text-5xl font-black tracking-tight md:text-6xl">
              Nutzungsbedingungen
            </h1>

            <div className="mt-10 space-y-8 rounded-[22px] border border-[#f0ded0] bg-white/82 p-8 text-base font-semibold leading-8 text-[#3d4556] shadow-[0_24px_70px_rgba(102,77,54,0.10)] backdrop-blur md:p-10">
              <p>
                Willkommen bei CharacterArc. Durch die Nutzung unserer App
                erklärst du dich mit diesen Nutzungsbedingungen einverstanden.
              </p>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  1. Nutzung der App
                </h2>
                <p className="mt-4">
                  CharacterArc ist eine App zur Selbstreflexion,
                  Verhaltensverfolgung und persönlichen Weiterentwicklung. Die
                  App dient ausschließlich zu Informations- und
                  Selbstreflexionszwecken. Die Nutzung erfolgt auf eigene
                  Verantwortung.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  2. Keine professionelle Beratung
                </h2>
                <p className="mt-4">
                  CharacterArc stellt keine psychologische, medizinische,
                  therapeutische oder rechtliche Beratung dar. Die App bietet
                  keine Diagnosen und ersetzt keine professionelle Hilfe. Wir
                  garantieren keine persönlichen Ergebnisse oder Veränderungen im
                  Verhalten.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  3. Nutzerkonto
                </h2>
                <p className="mt-4">
                  Für bestimmte Funktionen kann die Erstellung eines Kontos
                  erforderlich sein. Du bist verantwortlich für:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6">
                  {accountResponsibilities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  4. Verhaltensdaten
                </h2>
                <p className="mt-4">
                  Die App ermöglicht es Nutzern, eigene Aktivitäten und
                  Verhaltensmuster zu dokumentieren. Du bist selbst
                  verantwortlich für die von dir eingegebenen Daten.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  5. Verbotene Nutzung
                </h2>
                <p className="mt-4">Es ist untersagt:</p>
                <ul className="mt-4 list-disc space-y-2 pl-6">
                  {prohibitedUses.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  6. Verfügbarkeit
                </h2>
                <p className="mt-4">
                  Wir bemühen uns um eine stabile Verfügbarkeit der App. Wir
                  garantieren jedoch keine unterbrechungsfreie oder fehlerfreie
                  Nutzung. Funktionen können jederzeit geändert, eingeschränkt
                  oder entfernt werden.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  7. Kündigung und Account-Löschung
                </h2>
                <p className="mt-4">
                  Nutzer können ihr Konto jederzeit löschen. Wir behalten uns
                  das Recht vor, Accounts bei Missbrauch oder Verstößen zu
                  sperren oder zu löschen.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  8. Haftungsbeschränkung
                </h2>
                <p className="mt-4">Wir haften nicht für:</p>
                <ul className="mt-4 list-disc space-y-2 pl-6">
                  {liabilityLimits.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="mt-4">
                  Soweit gesetzlich zulässig, ist unsere Haftung ausgeschlossen
                  oder beschränkt.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  9. Datenschutz
                </h2>
                <p className="mt-4">
                  Informationen zur Verarbeitung personenbezogener Daten findest
                  du in unserer{" "}
                  <Link
                    className="font-black text-[#5f9672] hover:underline"
                    href="/datenschutz"
                  >
                    Datenschutzerklärung
                  </Link>
                  .
                </p>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  10. Änderungen
                </h2>
                <p className="mt-4">
                  Wir können diese Nutzungsbedingungen jederzeit anpassen.
                  Aktualisierte Bedingungen werden in der App oder auf unserer
                  Website veröffentlicht.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  11. Kontakt
                </h2>
                <p className="mt-4">
                  Bei Fragen:
                  <br />
                  <a
                    className="font-black text-[#5f9672] hover:underline"
                    href="mailto:mellaomar00@gmail.com"
                  >
                    mellaomar00@gmail.com
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
