"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

const footerBackgroundByRoute: Record<string, string> = {};
const accountDeletionNetworkError =
  "Die Verbindung ist fehlgeschlagen. Bitte versuche es erneut.";

export default function SiteFooter() {
  const pathname = usePathname();
  const backgroundColor = footerBackgroundByRoute[pathname ?? "/"] ?? "#fff8ee";
  const [user, setUser] = useState<User | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        setUser(data.user ?? null);
      })
      .catch(() => {
        setUser(null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function deleteAccount() {
    if (!user || isDeleting) return;

    setIsDeleting(true);
    setDeleteError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setDeleteError("Bitte melde dich erneut an, bevor du dein Konto löschst.");
        return;
      }

      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setDeleteError(
          result.error ?? "Dein Konto konnte gerade nicht gelöscht werden."
        );
        return;
      }

      window.localStorage.removeItem(`characterarc-reflections-${user.id}`);
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setDeleteError(accountDeletionNetworkError);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <footer
        className="px-6 py-10 text-sm font-bold text-[#6e7583]"
        style={{ backgroundColor }}
      >
        <div className="mx-auto flex max-w-[1500px] flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="flex items-center gap-3 text-[#171c2d]">
            <Image
              src="/characterarc-icon.png"
              alt="CharacterArc"
              width={34}
              height={34}
              className="rounded-xl"
            />
            <span>CA</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-9">
            <Link href="/datenschutz">Datenschutz</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/impressum">Impressum</Link>
            {user && (
              <button
                className="font-bold text-red-500 transition hover:text-red-600"
                onClick={() => {
                  setDeleteError("");
                  setIsConfirmOpen(true);
                }}
              >
                Account löschen
              </button>
            )}
          </nav>
        </div>
      </footer>

      {isConfirmOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#171c2d]/35 p-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-[22px] border border-[#f0ded0] bg-white p-6 text-[#171c2d] shadow-2xl">
            <h2 className="text-2xl font-black">Account löschen?</h2>
            <p className="mt-4 text-sm font-semibold leading-6 text-[#3d4556]">
              Bist du sicher? Dein Account und alle mit deiner E-Mail
              gespeicherten Daten werden dauerhaft gelöscht. Diese Aktion kann
              nicht rückgängig gemacht werden.
            </p>

            {deleteError && (
              <p className="mt-4 rounded-xl bg-[#fff1f1] px-4 py-3 text-sm font-bold text-red-600">
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-full border border-[#f0ded0] bg-white px-5 py-3 text-sm font-black text-[#171c2d] transition hover:bg-[#fff4e8]"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isDeleting}
              >
                Abbrechen
              </button>
              <button
                className="rounded-full bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void deleteAccount()}
                disabled={isDeleting}
              >
                {isDeleting ? "Wird gelöscht..." : "Löschen"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
