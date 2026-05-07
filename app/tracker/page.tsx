"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import {
  type Action,
  TODAY,
  calculateDailyScore,
  calculateTraits,
  getActionRule,
  getActionsForDate,
  getConsistencyStreak,
  getDateDaysAgo,
  getInsights,
  getSelectedTraitRows,
  hasCleanPositiveDay,
} from "../lib/characterArc";
import { supabase } from "../lib/supabase";

type CalendarDateElement = HTMLElement & {
  value?: string;
};

type SavedTraitProgress = Record<string, { level: number; xp: number }>;

function groupActions(actions: Action[]) {
  return actions.reduce<Record<string, Action[]>>((groups, action) => {
    if (!groups[action.label]) groups[action.label] = [];
    groups[action.label].push(action);
    return groups;
  }, {});
}

function getSavedTraitProgress(actions: Action[], dayActions: Action[], today: string) {
  return calculateTraits(actions, dayActions, today).reduce<SavedTraitProgress>(
    (progress, trait) => {
      progress[trait.name] = { level: trait.level, xp: trait.xp };
      return progress;
    },
    {}
  );
}

function hasNegativeAction(actions: Action[]) {
  return actions.some((action) => getActionRule(action.label).weight < 0);
}

export default function TrackerPage() {
  const today = TODAY;

  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedActions, setSelectedActions] = useState<Action[]>([]);
  const [allActions, setAllActions] = useState<Action[]>([]);
  const [reflections, setReflections] = useState<Record<string, string>>({});
  const [isUndoing, setIsUndoing] = useState(false);
  const [progressEffect, setProgressEffect] = useState<"gain" | "loss" | null>(
    null
  );
  const [cooldownAction, setCooldownAction] = useState<string | null>(null);
  const [antiGamingMessage, setAntiGamingMessage] = useState("");
  const [lastMilestone, setLastMilestone] = useState("");

  const clickSoundRef = useRef<HTMLAudioElement | null>(null);
  const badClickSoundRef = useRef<HTMLAudioElement | null>(null);
  const calendarRef = useRef<CalendarDateElement | null>(null);
  const undoInProgressRef = useRef(false);

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/tracker`,
      },
    });

    if (error) console.error("Google login error:", error);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    window.location.href = "/";
  }

  async function loadAllActions(currentUser: User) {
    const { data, error } = await supabase
      .from("daily_actions")
      .select("id, date, label, amount, user_id")
      .eq("user_id", currentUser.id)
      .order("date", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      console.error("Load all actions error:", error);
      return [];
    }

    const actions = data ?? [];
    setAllActions(actions);
    return actions;
  }

  async function saveDailyProgress(
    currentUser: User,
    date: string,
    totalXp: number,
    traits: SavedTraitProgress
  ) {
    const payload = {
      date,
      total_xp: totalXp,
      traits,
      user_id: currentUser.id,
    };

    const { data: existingProgress, error: checkError } = await supabase
      .from("daily_progress")
      .select("date, user_id")
      .eq("date", date)
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (checkError) {
      console.warn("Check progress warning:", JSON.stringify(checkError, null, 2));
      return;
    }

    const query = existingProgress
      ? supabase
          .from("daily_progress")
          .update(payload)
          .eq("date", date)
          .eq("user_id", currentUser.id)
      : supabase.from("daily_progress").insert(payload);
    const { error } = await query;

    if (error) {
      console.warn("Save progress warning:", JSON.stringify(error, null, 2));
    }
  }

  async function loadSelectedDay(date: string, currentUser: User) {
    const { data: actionsData, error: actionsError } = await supabase
      .from("daily_actions")
      .select("id, date, label, amount, user_id")
      .eq("date", date)
      .eq("user_id", currentUser.id)
      .order("id", { ascending: false });

    if (actionsError) {
      console.error("Load selected actions error:", actionsError);
      return;
    }

    setSelectedDate(date);
    setSelectedActions(actionsData ?? []);
  }

  async function addAction(label: string, amount: number) {
    if (!user || cooldownAction === label) return;

    const rule = getActionRule(label);
    const todayActions = getActionsForDate(allActions, today);
    const repeatCount = todayActions.filter((action) => action.label === label).length;
    const reflection = reflections[today]?.trim() ?? "";

    if (
      rule.weight > 0 &&
      rule.reflectionRequiredAfter !== undefined &&
      repeatCount >= rule.reflectionRequiredAfter &&
      reflection.length < 20
    ) {
      setAntiGamingMessage(
        "Add a short reflection before repeating that high-impact action again today."
      );
      return;
    }

    setAntiGamingMessage("");

    if (rule.weight > 0) {
      setCooldownAction(label);

      if (clickSoundRef.current) {
        clickSoundRef.current.pause();
        clickSoundRef.current.currentTime = 0;

        void clickSoundRef.current.play().catch((error) => {
          console.error("Sound play error:", error);
        });
      }

      setTimeout(() => {
        setCooldownAction(null);
      }, repeatCount > 0 ? 2000 : 1000);
    }

    if (rule.weight < 0 && badClickSoundRef.current) {
      badClickSoundRef.current.pause();
      badClickSoundRef.current.currentTime = 0;
      badClickSoundRef.current.volume = 0.3;

      void badClickSoundRef.current.play().catch((error) => {
        console.error("Bad sound play error:", error);
      });
    }

    const beforeTraits = calculateTraits(allActions, selectedActions, today);

    setProgressEffect(rule.weight > 0 ? "gain" : "loss");

    setTimeout(() => {
      setProgressEffect(null);
    }, 600);

    const { error: actionError } = await supabase
      .from("daily_actions")
      .insert({
        date: today,
        label,
        amount,
        user_id: user.id,
      })
      .select("id, date, label, amount, user_id")
      .single();

    if (actionError) {
      console.error("Save action error:", actionError);
      return;
    }

    const refreshedActions = await loadAllActions(user);
    const refreshedTodayActions = getActionsForDate(refreshedActions, today);
    const newValue = calculateDailyScore(today, refreshedTodayActions, refreshedActions);
    const afterTraits = calculateTraits(refreshedActions, refreshedTodayActions, today);
    const milestone = afterTraits.find((trait) => {
      const previous = beforeTraits.find((beforeTrait) => beforeTrait.name === trait.name);
      return previous && trait.level > previous.level;
    });

    setProgress(newValue);
    void saveDailyProgress(
      user,
      today,
      newValue,
      getSavedTraitProgress(refreshedActions, refreshedTodayActions, today)
    );

    if (milestone) {
      setLastMilestone(`${milestone.name} reached Level ${milestone.level}`);
    }

    if (selectedDate === today) {
      setSelectedActions(refreshedTodayActions);
    }
  }

  async function undoLastAction() {
    if (!user || undoInProgressRef.current) return;

    undoInProgressRef.current = true;
    setIsUndoing(true);

    try {
      const { data: lastAction, error: fetchError } = await supabase
        .from("daily_actions")
        .select("*")
        .eq("date", today)
        .eq("user_id", user.id)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error("Fetch last action error:", fetchError);
        return;
      }

      if (!lastAction) return;

      const { error: deleteError } = await supabase
        .from("daily_actions")
        .delete()
        .eq("id", lastAction.id)
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("Delete action error:", deleteError);
        return;
      }

      const refreshedActions = await loadAllActions(user);
      const refreshedTodayActions = getActionsForDate(refreshedActions, today);
      const newProgress = calculateDailyScore(
        today,
        refreshedTodayActions,
        refreshedActions
      );

      setProgressEffect(getActionRule(lastAction.label).weight > 0 ? "loss" : "gain");
      setProgress(newProgress);
      void saveDailyProgress(
        user,
        today,
        newProgress,
        getSavedTraitProgress(refreshedActions, refreshedTodayActions, today)
      );

      setTimeout(() => {
        setProgressEffect(null);
      }, 600);

      if (selectedDate === today) {
        setSelectedActions(refreshedTodayActions);
      }
    } finally {
      undoInProgressRef.current = false;
      setIsUndoing(false);
    }
  }

  const goodActions = selectedActions.filter((action) => action.amount > 0);
  const badActions = selectedActions.filter((action) => action.amount < 0);
  const groupedGoodActions = groupActions(goodActions);
  const groupedBadActions = groupActions(badActions);
  const selectedProgress = useMemo(
    () => calculateDailyScore(selectedDate, selectedActions, allActions),
    [allActions, selectedActions, selectedDate]
  );
  const traits = useMemo(
    () => calculateTraits(allActions, selectedActions, today),
    [allActions, selectedActions, today]
  );
  const selectedTraitRows = useMemo(
    () => getSelectedTraitRows(selectedActions),
    [selectedActions]
  );
  const insights = useMemo(
    () => getInsights(allActions, traits, today),
    [allActions, traits, today]
  );
  const currentStreak = useMemo(
    () => getConsistencyStreak(allActions, today),
    [allActions, today]
  );
  const achievements = traits
    .filter((trait) => trait.level >= 3)
    .map((trait) => `${trait.name} L${trait.level}`)
    .slice(0, 4);
  const selectedReflection = reflections[selectedDate] ?? "";
  const weekDots = Array.from({ length: 7 }, (_value, index) => {
    const date = getDateDaysAgo(today, 6 - index);
    const dayActions = getActionsForDate(allActions, date);

    return {
      date,
      hasCleanDay: hasCleanPositiveDay(dayActions),
      hasNegativeDay: hasNegativeAction(dayActions),
      hasActions: dayActions.length > 0,
    };
  });

  useEffect(() => {
    clickSoundRef.current = new Audio("/click.mp3");
    clickSoundRef.current.volume = 0.4;

    badClickSoundRef.current = new Audio("/hit.mp3");
    badClickSoundRef.current.volume = 1;

    void import("cally");

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    void (async () => {
      const currentToday = TODAY;
      const savedReflections = window.localStorage.getItem(
        `characterarc-reflections-${user.id}`
      );

      if (savedReflections) {
        try {
          setReflections(JSON.parse(savedReflections) as Record<string, string>);
        } catch (error) {
          console.error("Reflection parse error:", error);
        }
      }

      const actions = await loadAllActions(user);
      const todayActions = getActionsForDate(actions, currentToday);

      setProgress(calculateDailyScore(currentToday, todayActions, actions));
      await loadSelectedDay(currentToday, user);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const calendar = calendarRef.current;
    if (!calendar) return;

    const handleChange = (event: Event) => {
      const element = event.currentTarget as CalendarDateElement;
      const date = element.value;

      if (!date) return;

      void loadSelectedDay(date, user);
    };

    calendar.addEventListener("change", handleChange);

    return () => {
      calendar.removeEventListener("change", handleChange);
    };
  }, [user]);

  useEffect(() => {
    if (!calendarRef.current || calendarRef.current.value === selectedDate) {
      return;
    }

    calendarRef.current.value = selectedDate;
  }, [selectedDate]);

  useEffect(() => {
    if (!user) return;

    window.localStorage.setItem(
      `characterarc-reflections-${user.id}`,
      JSON.stringify(reflections)
    );
  }, [reflections, user]);

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F6FBF4] p-6 text-[#1F3A2E]">
        <div className="w-full max-w-sm rounded-3xl border border-[#DDEBDD] bg-[#F9FFF8] p-8 text-center shadow-2xl">
          <div className="text-5xl">🌱</div>

          <h1 className="mt-4 text-3xl font-black">CharacterArc</h1>

          <p className="mt-3 text-[#5F7A6B]">
            Sign in to start tracking your real-life character score.
          </p>

          <button
            className="mt-8 w-full rounded-full bg-[#7BC47F] px-6 py-4 font-black text-white shadow-lg transition hover:scale-105 hover:bg-[#68b06c]"
            onClick={signInWithGoogle}
          >
            Continue with Google
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6FBF4] px-6 py-8 text-[#1F3A2E]">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-8">
        <header className="flex w-full items-center justify-between">
          <Link
            href="/tracker"
            className="flex items-center gap-2 text-lg font-black transition hover:text-[#6BAA75]"
          >
            <span className="text-2xl">🌱</span>
            <span>CharacterArc</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/stats"
              className="rounded-full border border-[#DDEBDD] bg-white px-5 py-2 text-sm font-bold text-[#5F7A6B] transition hover:bg-[#E8F5E9] hover:text-[#1F3A2E]"
            >
              Stats
            </Link>

            <button
              className="rounded-full border border-[#DDEBDD] bg-white px-5 py-2 text-sm font-bold text-[#5F7A6B] transition hover:bg-[#E8F5E9] hover:text-[#1F3A2E]"
              onClick={signOut}
            >
              Logout
            </button>
          </div>
        </header>

        <section className="w-full max-w-md rounded-3xl border border-[#DDEBDD] bg-white p-8 text-center shadow-xl">
          <div className="flex w-full justify-start">
            <button
              className="rounded-full bg-[#E8F5E9] px-4 py-2 text-lg font-black text-[#1F3A2E] transition hover:bg-[#DDEBDD] disabled:opacity-50"
              onClick={undoLastAction}
              disabled={isUndoing}
              title="Undo last action"
            >
              ↩
            </button>
          </div>

          <h1 className="mt-8 text-5xl font-black tracking-tight">Today</h1>

          <div className="mt-8 h-5 w-full overflow-hidden rounded-full bg-[#E8F5E9]">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                progressEffect === "loss"
                  ? "bg-red-500"
                  : progressEffect === "gain"
                  ? "bg-[#7BC47F]"
                  : "bg-[#6BAA75]"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-4 text-3xl font-black">{progress}%</p>

          <p className="mt-1 text-sm font-medium text-[#5F7A6B]">
            Your daily personality score
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              className="btn btn-success"
              onClick={() => addAction("Helped someone", 20)}
              disabled={cooldownAction === "Helped someone"}
            >
              Help someone
            </button>

            <button
              className="btn btn-primary"
              onClick={() => addAction("Complimented someone", 10)}
              disabled={cooldownAction === "Complimented someone"}
            >
              Compliment
            </button>

            <button
              className="btn btn-warning"
              onClick={() => addAction("Insulted someone", -10)}
            >
              Insult
            </button>

            <button
              className="btn btn-error"
              onClick={() => addAction("Hurt someone", -20)}
            >
              Hurt someone
            </button>
          </div>

          {antiGamingMessage && (
            <p className="mt-4 text-sm font-bold text-[#5F7A6B]">
              {antiGamingMessage}
            </p>
          )}
        </section>

        <div className="grid w-full max-w-6xl grid-cols-1 items-start gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <section className="h-fit rounded-3xl border border-[#DDEBDD] bg-white p-6 shadow-xl">
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F5E9] text-xl">
                ✨
              </div>

              <h2 className="text-2xl font-black text-[#1F3A2E]">Traits</h2>
            </div>

            <div className="space-y-5">
              {traits.map((trait) => (
                <div
                  key={trait.name}
                  className={
                    lastMilestone.startsWith(trait.name)
                      ? "animate-pulse rounded-2xl bg-[#F6FBF4] p-2 transition"
                      : ""
                  }
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#1F3A2E]">
                      {trait.name}
                    </span>
                    <span className="text-xs font-bold text-[#5F7A6B]">
                      Level {trait.level}
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-[#E8F5E9]">
                    <div
                      className="h-full rounded-full bg-[#6BAA75]"
                      style={{ width: `${trait.progressPercent}%` }}
                    />
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] font-bold text-[#5F7A6B]">
                    <span>{trait.xp} XP</span>
                    <span>
                      Today {trait.dailyXp >= 0 ? "+" : ""}
                      {trait.dailyXp} XP
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-bold text-[#5F7A6B]">
                    {trait.monthlyTrendLabel}
                  </p>
                </div>
              ))}
            </div>

            {lastMilestone && (
              <p className="mt-6 rounded-2xl bg-[#E8F5E9] px-4 py-3 text-sm font-black text-[#1F3A2E]">
                {lastMilestone}
              </p>
            )}

            {achievements.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {achievements.map((achievement) => (
                  <span
                    key={achievement}
                    className="rounded-full bg-[#F6FBF4] px-3 py-1 text-xs font-black text-[#5F7A6B]"
                  >
                    {achievement}
                  </span>
                ))}
              </div>
            )}
          </section>

          <div className="flex w-full flex-col gap-6">
            <calendar-date
              ref={calendarRef}
              defaultValue={selectedDate}
              onChange={(event) => {
                const date = (event.currentTarget as CalendarDateElement).value;

                if (!date || !user) return;

                void loadSelectedDay(date, user);
              }}
              style={
                {
                  "--color-primary": "#A8B5AA",
                  "--color-primary-content": "#1F3A2E",
                  "--p": "129 8% 68%",
                  "--pc": "151 30% 17%",
                  "--fallback-p": "#A8B5AA",
                  "--fallback-pc": "#1F3A2E",
                  "--btn-fg": "#1F3A2E",
                } as React.CSSProperties
              }
              className="cally w-full rounded-3xl border border-[#DDEBDD] bg-white p-8 text-[#1F3A2E] shadow-xl"
            >
              <svg
                aria-label="Previous"
                className="size-6 rounded-full bg-[#DDEBDD] p-1 text-[#1F3A2E]"
                slot="previous"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>

              <svg
                aria-label="Next"
                className="size-6 rounded-full bg-[#DDEBDD] p-1 text-[#1F3A2E]"
                slot="next"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>

              <calendar-month></calendar-month>
            </calendar-date>

            <section className="w-full rounded-3xl border border-[#DDEBDD] bg-white p-8 shadow-xl">
              <h2 className="text-3xl font-black">Selected day</h2>

              <p className="mt-2 text-sm font-semibold text-[#5F7A6B]">
                {selectedDate}
              </p>

              <div className="mt-6 h-4 w-full overflow-hidden rounded-full bg-[#E8F5E9]">
                <div
                  className="h-full rounded-full bg-[#7BC47F]"
                  style={{ width: `${selectedProgress}%` }}
                />
              </div>

              <p className="mt-3 text-xl font-black">{selectedProgress}%</p>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                {selectedTraitRows.length === 0 ? (
                  <p className="text-sm font-medium text-[#5F7A6B]">
                    No traits affected on this day.
                  </p>
                ) : (
                  selectedTraitRows.map((row) => (
                    <div
                      key={row.trait}
                      className="flex items-center justify-between rounded-2xl bg-[#F6FBF4] px-4 py-3"
                    >
                      <span className="text-sm font-bold text-[#1F3A2E]">
                        {row.trait}
                      </span>
                      <span
                        className={`text-sm font-black ${
                          row.xp > 0 ? "text-[#6BAA75]" : "text-red-500"
                        }`}
                      >
                        {row.xp > 0 ? "+" : ""}
                        {row.xp} XP
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="my-8 h-px w-full bg-[#DDEBDD]" />

              <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-1">
                <div>
                  <h3 className="mb-3 font-black text-[#6BAA75]">
                    Good actions
                  </h3>

                  {goodActions.length === 0 ? (
                    <p className="text-sm text-[#5F7A6B]">
                      No good actions saved.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(groupedGoodActions).map(
                        ([label, actions]) => (
                          <details
                            key={label}
                            className="collapse collapse-arrow rounded-2xl bg-[#E8F5E9]"
                          >
                            <summary className="collapse-title font-bold">
                              {label} x {actions.length}
                            </summary>

                            <div className="collapse-content space-y-2">
                              {actions.map((action) => (
                                <div
                                  key={action.id}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-sm">{action.label}</span>
                                  <span className="font-black text-[#6BAA75]">
                                    +{action.amount}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-3 font-black text-red-500">Bad actions</h3>

                  {badActions.length === 0 ? (
                    <p className="text-sm text-[#5F7A6B]">
                      No bad actions saved.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(groupedBadActions).map(
                        ([label, actions]) => (
                          <details
                            key={label}
                            className="collapse collapse-arrow rounded-2xl bg-[#FFF1F1]"
                          >
                            <summary className="collapse-title font-bold">
                              {label} x {actions.length}
                            </summary>

                            <div className="collapse-content space-y-2">
                              {actions.map((action) => (
                                <div
                                  key={action.id}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-sm">{action.label}</span>
                                  <span className="font-black text-red-500">
                                    {action.amount}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <h3 className="mb-3 font-black text-[#1F3A2E]">Reflection</h3>
                <textarea
                  className="min-h-28 w-full resize-none rounded-2xl border border-[#DDEBDD] bg-[#F9FFF8] p-4 text-sm font-medium leading-6 text-[#1F3A2E] outline-none transition focus:border-[#A8B5AA]"
                  placeholder="Write a note for this day..."
                  value={selectedReflection}
                  onChange={(event) => {
                    const note = event.target.value;

                    setReflections((currentReflections) => ({
                      ...currentReflections,
                      [selectedDate]: note,
                    }));
                  }}
                />
              </div>
            </section>
          </div>

          <section className="h-fit rounded-3xl border border-[#DDEBDD] bg-white p-7 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F5E9] text-xl">
                🔥
              </div>

              <h2 className="text-2xl font-black leading-tight text-[#1F3A2E]">
                Daily tracker
              </h2>
            </div>

            <div className="mt-9 flex items-end gap-2">
              <p className="text-6xl font-black leading-none text-[#1F3A2E]">
                {currentStreak}
              </p>
              <p className="pb-2 text-lg font-bold text-[#5F7A6B]">days</p>
            </div>

            <p className="mt-4 text-sm font-medium leading-6 text-[#5F7A6B]">
              {currentStreak > 0
                ? "Clean positive streak based on your action history."
                : "Start by logging your first action today."}
            </p>

            <div className="mt-9 grid grid-cols-7 gap-2 text-center">
              {weekDots.map((day) => (
                <div key={day.date} className="flex flex-col items-center gap-2">
                  <span className="text-xs font-black text-[#5F7A6B]">
                    {new Date(`${day.date}T00:00:00`)
                      .toLocaleDateString("en-US", { weekday: "short" })
                      .charAt(0)}
                  </span>

                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${
                      day.hasCleanDay
                        ? "bg-[#E8F5E9] text-[#6BAA75]"
                        : day.hasNegativeDay
                        ? "bg-[#FFF1F1] text-red-500"
                        : "bg-[#F6FBF4] text-[#A8B5AA]"
                    }`}
                  >
                    {day.hasCleanDay ? "OK" : day.hasNegativeDay ? "!" : "-"}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-3">
              {insights.length === 0 ? (
                <p className="text-sm font-medium leading-6 text-[#5F7A6B]">
                  Insights will appear as your history grows.
                </p>
              ) : (
                insights.map((insight) => (
                  <p
                    key={insight}
                    className="rounded-2xl bg-[#F6FBF4] px-4 py-3 text-sm font-bold leading-5 text-[#5F7A6B]"
                  >
                    {insight}
                  </p>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <style>{`
  calendar-date {
    --color-primary: #A8B5AA !important;
    --color-primary-content: #1F3A2E !important;
    --color-accent: #A8B5AA !important;
    --color-text-on-accent: #111827 !important;
    --p: 129 8% 68% !important;
    --pc: 151 30% 17% !important;
    --fallback-p: #A8B5AA !important;
    --fallback-pc: #1F3A2E !important;
  }

  calendar-month::part(day) {
    border-radius: 9999px;
    color: #1F3A2E;
  }

  calendar-month::part(day selected) {
    background-color: #A8B5AA !important;
    color: #111827 !important;
  }

  calendar-month::part(day today),
  calendar-month::part(day today selected) {
    background-color: #DBEAFE !important;
    color: #1E40AF !important;
  }
`}</style>
    </main>
  );
}
