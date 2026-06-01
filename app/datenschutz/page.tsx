import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

export const metadata: Metadata = {
  title: "Datenschutzerklärung | CharacterArc",
  description: "Datenschutzerklärung von CharacterArc.",
};

const collectedData = [
  "Name (falls angegeben)",
  "E-Mail-Adresse",
  "Login-Daten",
  "Von dir ausgewählte Aktionen innerhalb der App (z. B. „Complimented someone“, „Helped someone“, „Insulted someone“, „Acted negatively“)",
  "Zeitstempel dieser Aktivitäten",
  "Fortschrittsdaten und Statistiken",
  "technische Nutzungsdaten (z. B. Gerät, Browser, IP-Adresse)",
];

const processingPurposes = [
  "dein Nutzerkonto bereitzustellen",
  "deine Fortschritte innerhalb der App darzustellen",
  "Statistiken und Verlauf bereitzustellen",
  "die Sicherheit und Stabilität der App zu gewährleisten",
  "technische Fehler zu analysieren und die App zu verbessern",
];

const userRights = [
  "Auskunft",
  "Berichtigung",
  "Löschung",
  "Einschränkung der Verarbeitung",
  "Datenübertragbarkeit",
  "Widerruf deiner Einwilligung",
  "Beschwerde bei einer Datenschutzbehörde",
];

export default function DatenschutzPage() {
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
            <p className="text-sm font-black text-[#7a8190]">Rechtliches</p>
            <h1 className="mt-4 text-5xl font-black tracking-tight md:text-6xl">
              Datenschutzerklärung
            </h1>

            <div className="mt-10 space-y-8 rounded-[22px] border border-[#f0ded0] bg-white/82 p-8 text-base font-semibold leading-8 text-[#3d4556] shadow-[0_24px_70px_rgba(102,77,54,0.10)] backdrop-blur md:p-10">
              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  1. Verantwortlicher
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
                </p>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  2. Welche Daten wir erfassen
                </h2>
                <p className="mt-4">
                  Bei der Nutzung unserer App können folgende personenbezogene
                  Daten erfasst werden:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6">
                  {collectedData.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  3. Zweck der Datenverarbeitung
                </h2>
                <p className="mt-4">Wir verarbeiten deine Daten, um:</p>
                <ul className="mt-4 list-disc space-y-2 pl-6">
                  {processingPurposes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  4. Hosting und Datenverarbeitung durch Drittanbieter
                </h2>
                <div className="mt-4 space-y-4">
                  <p>
                    <span className="font-black text-[#171c2d]">Supabase</span>
                    <br />
                    Wir nutzen Supabase für Datenbank, Authentifizierung und
                    Speicherung von Nutzerdaten.
                  </p>
                  <p>
                    <span className="font-black text-[#171c2d]">Vercel</span>
                    <br />
                    Wir nutzen Vercel für Hosting und Bereitstellung der App.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  5. Speicherung der Daten
                </h2>
                <p className="mt-4">
                  Deine Daten werden gespeichert, solange dein Konto aktiv ist
                  oder solange dies für die Bereitstellung der App erforderlich
                  ist. Wenn du dein Konto löschst, werden deine
                  personenbezogenen Daten gelöscht, sofern keine gesetzlichen
                  Aufbewahrungspflichten bestehen.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  6. Deine Rechte
                </h2>
                <p className="mt-4">Du hast jederzeit das Recht auf:</p>
                <ul className="mt-4 list-disc space-y-2 pl-6">
                  {userRights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="mt-4">
                  Du kannst dein Konto in der App über den Button
                  &quot;Account löschen&quot; im Footer löschen. Vor der
                  Löschung wirst du gefragt, ob du sicher bist.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  7. Datensicherheit
                </h2>
                <p className="mt-4">
                  Wir treffen technische und organisatorische Maßnahmen, um deine
                  Daten vor Verlust, Missbrauch oder unbefugtem Zugriff zu
                  schützen.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-black text-[#171c2d]">
                  8. Kontakt
                </h2>
                <p className="mt-4">
                  Bei Fragen zum Datenschutz kannst du uns kontaktieren:
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
