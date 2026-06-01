"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ClipboardList, LogOut } from "lucide-react";
import {
  type Action,
  type TraitName,
  TODAY,
  calculateDailyScore,
  calculateTraits,
  getActionTotals,
  getActionsForDate,
  getConsistencyStreak,
  getDateDaysAgo,
  getScoreBarPercent,
  getSelectedTraitRows,
  getTraitImpact,
} from "../lib/characterArc";
import { supabase } from "../lib/supabase";

type ChartMetric = "Overall Score" | TraitName;

type ChartPoint = {
  date: string;
  label: string;
  value: number;
};

type DailyReflectionRow = {
  date: string;
  content: string;
};

const STATS_TRAITS: TraitName[] = ["Kindness", "Confidence", "Discipline"];
const CHART_METRICS: ChartMetric[] = ["Overall Score", ...STATS_TRAITS];
const CHART_WIDTH = 720;
const CHART_HEIGHT = 260;
const CHART_PADDING = 28;
const DISCIPLINE_ACTIVITY_XP = 2;
const DISCIPLINE_POSITIVE_ACTION_XP = 4;

function buildDateRange(today: string, days: number) {
  return Array.from({ length: days }, (_value, index) =>
    getDateDaysAgo(today, days - 1 - index)
  );
}
function getDisciplineChartValue(date: string, actions: Action[]) {
  const dayActions = getActionsForDate(actions, date);

  if (dayActions.length === 0) return 0;

  const positiveActions = dayActions.filter((action) => action.amount > 0).length;

  return DISCIPLINE_ACTIVITY_XP + positiveActions * DISCIPLINE_POSITIVE_ACTION_XP;
}

function getMetricValue(metric: ChartMetric, date: string, actions: Action[]) {
  const actionsUpToDate = actions.filter((action) => action.date <= date);

  if (metric === "Overall Score") {
    const dayActions = getActionsForDate(actions, date);

    return calculateDailyScore(date, dayActions, actions);
  }

  if (metric === "Discipline") {
    return getDisciplineChartValue(date, actions);
  }

  return Math.max(0, getTraitImpact(actionsUpToDate)[metric]);
}

function getStatsEndDate(actions: Action[]) {
  return actions.length > 0 && actions[actions.length - 1].date > TODAY
    ? actions[actions.length - 1].date
    : TODAY;
}

function buildChartData(metric: ChartMetric, actions: Action[], endDate: string) {
  return buildDateRange(endDate, 30).map((date) => ({
    date,
    label: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    value: getMetricValue(metric, date, actions),
  }));
}

function buildChartPath(points: ChartPoint[]) {
  const minValue = Math.min(0, ...points.map((point) => point.value));
  const maxValue = Math.max(10, ...points.map((point) => point.value));
  const valueRange = maxValue - minValue || 1;
  const usableWidth = CHART_WIDTH - CHART_PADDING * 2;
  const usableHeight = CHART_HEIGHT - CHART_PADDING * 2;

  const coordinates = points.map((point, index) => {
    const x =
      CHART_PADDING +
      (points.length === 1 ? usableWidth : (index / (points.length - 1)) * usableWidth);
    const y =
      CHART_HEIGHT -
      CHART_PADDING -
      ((point.value - minValue) / valueRange) * usableHeight;

    return { ...point, x, y };
  });
  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${
    coordinates[coordinates.length - 1]?.x ?? CHART_PADDING
  } ${CHART_HEIGHT - CHART_PADDING} L ${CHART_PADDING} ${
    CHART_HEIGHT - CHART_PADDING
  } Z`;

  return {
    areaPath,
    coordinates,
    linePath,
    maxValue,
    minValue,
  };
}

async function loadReflections(currentUser: User) {
  const { data, error } = await supabase
    .from("daily_reflections")
    .select("date, content")
    .eq("user_id", currentUser.id);

  if (error) {
    console.warn("Stats reflections load warning:", JSON.stringify(error, null, 2));
    return {};
  }

  return ((data ?? []) as DailyReflectionRow[]).reduce<Record<string, string>>(
    (loadedReflections, reflection) => {
      loadedReflections[reflection.date] = reflection.content;
      return loadedReflections;
    },
    {}
  );
}

export default function StatsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [actions, setActions] = useState<Action[] | null>(null);
  const [reflections, setReflections] = useState<Record<string, string>>({});
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>("Overall Score");
  const [selectedPoint, setSelectedPoint] = useState<ChartPoint | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (!data.user) setActions([]);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setActions([]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    window.location.href = "/";
  }

  useEffect(() => {
    if (!user) return;

    void (async () => {
      const savedReflections = window.localStorage.getItem(
        `characterarc-reflections-${user.id}`
      );

      if (savedReflections) {
        try {
          setReflections(JSON.parse(savedReflections) as Record<string, string>);
        } catch (error) {
          console.error("Stats reflection parse error:", error);
        }
      }

      const [{ data, error }, databaseReflections] = await Promise.all([
        supabase
          .from("daily_actions")
          .select("id, date, label, amount, user_id")
          .eq("user_id", user.id)
          .order("date", { ascending: true })
          .order("id", { ascending: true }),
        loadReflections(user),
      ]);

      if (error) {
        console.error("Stats actions load error:", error);
        setActions([]);
        return;
      }

      setActions(data ?? []);
      setReflections((currentReflections) => ({
        ...currentReflections,
        ...databaseReflections,
      }));
    })();
  }, [user]);

  const loadedActions = useMemo(() => actions ?? [], [actions]);
  const todayActions = useMemo(
    () => getActionsForDate(loadedActions, TODAY),
    [loadedActions]
  );
  const traits = useMemo(
    () => calculateTraits(loadedActions, todayActions, TODAY),
    [loadedActions, todayActions]
  );
  const visibleTraits = useMemo(
    () => traits.filter((trait) => STATS_TRAITS.includes(trait.name)),
    [traits]
  );
  const totals = useMemo(() => getActionTotals(loadedActions), [loadedActions]);
  const score = useMemo(
    () => calculateDailyScore(TODAY, todayActions, loadedActions),
    [loadedActions, todayActions]
  );
  const streak = useMemo(
    () => getConsistencyStreak(loadedActions, TODAY),
    [loadedActions]
  );
  const statsEndDate = useMemo(
    () => getStatsEndDate(loadedActions),
    [loadedActions]
  );
  const chartData = useMemo(
    () => buildChartData(selectedMetric, loadedActions, statsEndDate),
    [loadedActions, selectedMetric, statsEndDate]
  );
  const chart = useMemo(() => buildChartPath(chartData), [chartData]);
  const selectedDay = selectedPoint?.date ?? statsEndDate;
  const selectedDayLabel =
    selectedPoint?.label ??
    new Date(`${statsEndDate}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  const selectedDayActions = useMemo(
    () => getActionsForDate(loadedActions, selectedDay),
    [loadedActions, selectedDay]
  );
  const selectedDayScore = useMemo(
    () => calculateDailyScore(selectedDay, selectedDayActions, loadedActions),
    [loadedActions, selectedDay, selectedDayActions]
  );
  const selectedTraitRows = useMemo(
    () => getSelectedTraitRows(selectedDayActions),
    [selectedDayActions]
  );
  const selectedReflection = reflections[selectedDay]?.trim() ?? "";
  const selectedTrait = useMemo(
    () =>
      selectedMetric === "Overall Score"
        ? null
        : visibleTraits.find((trait) => trait.name === selectedMetric) ?? null,
    [selectedMetric, visibleTraits]
  );
  const selectedMetricActions = useMemo(() => {
    if (selectedMetric === "Overall Score") return [];

    return loadedActions.filter(
      (action) => (getTraitImpact([action])[selectedMetric] ?? 0) !== 0
    );
  }, [loadedActions, selectedMetric]);
  const isLoading = user !== null && actions === null;

  if (!user && actions !== null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8ee] p-6 text-[#171c2d]">
        <section className="w-full max-w-sm rounded-[22px] border border-[#f0ded0] bg-[#FFFFFF] p-8 text-center shadow-[0_24px_70px_rgba(102,77,54,0.12)]">
          <Image
            src="/characterarc-icon.png"
            alt="CharacterArc"
            width={88}
            height={88}
            className="mx-auto rounded-[22px] shadow-[0_14px_32px_rgba(95,150,114,0.2)]"
            priority
          />

          <h1 className="mt-4 text-3xl font-black">Stats</h1>
          <p className="mt-3 text-sm font-medium text-[#111827]">
            Sign in from CharacterArc to see your progress analytics.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="stats-page relative min-h-screen overflow-hidden bg-[#fff8ee] px-4 py-6 text-[#171c2d] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-40 rounded-[60%_40%_55%_45%/45%_58%_42%_55%] bg-[#f6dccb]" />
      <div className="pointer-events-none absolute -right-20 top-0 h-80 w-48 rounded-[45%_55%_51%_49%/50%_55%_45%_50%] bg-[#dcecdf]" />
      <div className="pointer-events-none absolute -bottom-10 left-4 h-56 w-80 rounded-[60%_40%_42%_58%/58%_45%_55%_42%] bg-[#fff1d2]" />
      <div className="pointer-events-none absolute -bottom-16 -right-14 h-40 w-44 rounded-[48%_52%_46%_54%/48%_53%_47%_52%] bg-[#ffb4a6]" />

      <div className="relative mx-auto w-full max-w-[1380px]">
        <header className="mb-5 flex min-h-14 w-full items-center justify-between overflow-visible px-1 py-1">
          <div className="flex h-12 items-center gap-3 px-1 text-lg font-black">
            <Image
              src="/characterarc-icon.png"
              alt="CharacterArc"
              width={38}
              height={38}
              className="shrink-0 rounded-xl shadow-sm"
              priority
            />
            <span>Stats</span>
          </div>

          <nav className="flex items-center gap-3 overflow-visible" aria-label="Account navigation">
            <Link
              href="/tracker"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#f0ded0] bg-white/90 text-[#171c2d] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff4e8]"
              aria-label="Tracker"
              title="Tracker"
            >
              <ClipboardList size={21} strokeWidth={2.4} />
            </Link>

            <button
              type="button"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#f0ded0] bg-white/90 text-[#171c2d] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff4e8]"
              onClick={signOut}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={21} strokeWidth={2.4} />
            </button>
          </nav>
        </header>

        <div className="grid w-full grid-cols-1 items-start gap-5 lg:grid-cols-[390px_minmax(0,1fr)] lg:gap-5">
          <aside className="flex flex-col gap-5 lg:col-start-1">
            <section className="h-fit rounded-[22px] border border-[#f0ded0] bg-white/82 p-6 shadow-[0_24px_70px_rgba(102,77,54,0.10)] backdrop-blur">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef7ee] text-sm font-black text-[#5f9672]">
                  %
                </div>

                <h1 className="text-2xl font-black text-[#111827]">Stats</h1>
              </div>

              <div className="space-y-4">
                {[
                  ["Overall score", `${score}%`],
                  ["Current streak", `${streak} days`],
                  ["Positive actions", totals.positive],
                  ["Negative actions", totals.negative],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-[#fff4e8] px-4 py-3 transition hover:bg-[#f6dccb]"
                  >
                    <p className="text-xs font-black text-[#111827]">{label}</p>
                    <p className="mt-1 text-3xl font-black text-[#111827]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-5 rounded-2xl bg-[#eef7ee] px-4 py-3 text-sm font-bold leading-6 text-[#111827]">
                Click any point in the chart to inspect that day and read its
                reflection.
              </p>
            </section>

            <section className="rounded-[22px] border border-[#f0ded0] bg-white/82 p-6 shadow-[0_24px_70px_rgba(102,77,54,0.10)] backdrop-blur">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff1d2] text-sm font-black text-[#171c2d]">
                  XP
                </div>

                <h2 className="text-2xl font-black text-[#111827]">Traits</h2>
              </div>

              <div className="space-y-5">
                {visibleTraits.map((trait) => (
                  <div key={trait.name}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-bold text-[#111827]">
                        {trait.name}
                      </span>
                      <span className="text-xs font-bold text-[#111827]">
                        Level {trait.level}
                      </span>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-[#f8ece2]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          trait.name === "Kindness"
                            ? "bg-[#f5bd00]"
                            : trait.name === "Confidence"
                            ? "bg-[#8a5de8]"
                            : "bg-[#5f9672]"
                        }`}
                        style={{ width: `${trait.progressPercent}%` }}
                      />
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] font-bold text-[#111827]">
                      <span>{trait.xp} XP</span>
                      <span>{trait.monthlyTrendLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <div className="flex min-w-0 flex-col gap-5 lg:col-start-2">
            <section className="rounded-[22px] border border-[#f0ded0] bg-white/82 p-7 shadow-[0_24px_70px_rgba(102,77,54,0.10)] backdrop-blur">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h1 className="text-5xl font-black leading-none tracking-tight md:text-6xl">
                    Progress
                  </h1>
                  <p className="mt-3 text-sm font-semibold text-[#111827]">
                    Personality progress over time.
                  </p>
                </div>

                <p className="text-sm font-bold text-[#111827]">{TODAY}</p>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                {CHART_METRICS.map((metric) => (
                  <button
                    key={metric}
                    className={`rounded-full px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 ${
                      selectedMetric === metric
                        ? "bg-[#5f9672] text-white shadow-sm"
                        : "bg-[#fff4e8] text-[#111827] hover:bg-[#f6dccb] hover:text-[#111827]"
                    }`}
                    onClick={() => {
                      setSelectedMetric(metric);
                      setSelectedPoint(null);
                    }}
                  >
                    {metric}
                  </button>
                ))}
              </div>

              <div className="mt-6 min-h-[320px] overflow-hidden rounded-[22px] border border-[#f0ded0] bg-[#FFFFFF] p-4">
                {isLoading ? (
                  <div className="flex h-[292px] items-center justify-center text-sm font-bold text-[#111827]">
                    Loading progress...
                  </div>
                ) : (
                  <svg
                    className="h-full min-h-[292px] w-full"
                    viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                    role="img"
                    aria-label={`${selectedMetric} over time`}
                  >
                    <defs>
                      <linearGradient id="scoreFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#5f9672" stopOpacity="0.32" />
                        <stop offset="100%" stopColor="#5f9672" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>

                    {[0, 1, 2, 3].map((line) => {
                      const y =
                        CHART_PADDING +
                        line * ((CHART_HEIGHT - CHART_PADDING * 2) / 3);

                      return (
                        <line
                          key={line}
                          stroke="#f0ded0"
                          strokeDasharray="5 8"
                          strokeWidth="1"
                          x1={CHART_PADDING}
                          x2={CHART_WIDTH - CHART_PADDING}
                          y1={y}
                          y2={y}
                        />
                      );
                    })}

                    <path
                      key={`${selectedMetric}-area`}
                      className="opacity-100 transition-all duration-500"
                      d={chart.areaPath}
                      fill="url(#scoreFill)"
                    />
                    <path
                      key={`${selectedMetric}-line`}
                      className="transition-all duration-500"
                      d={chart.linePath}
                      fill="none"
                      stroke="#5f9672"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="5"
                    />

                    {chart.coordinates.map((point, index) => {
                      const isSelected = selectedDay === point.date;

                      return (
                        <circle
                          key={`${point.date}-${index}`}
                          className="cursor-pointer transition-all duration-300"
                          cx={point.x}
                          cy={point.y}
                          fill={isSelected ? "#5f9672" : "#FFFFFF"}
                          r={isSelected ? 7 : index === chart.coordinates.length - 1 ? 5 : 3}
                          onClick={() => setSelectedPoint(point)}
                          stroke="#5f9672"
                          strokeWidth="3"
                        >
                          <title>{`${point.label}: ${point.value}`}</title>
                        </circle>
                      );
                    })}

                    <text
                      fill="#111827"
                      fontSize="12"
                      fontWeight="700"
                      x={CHART_PADDING}
                      y={CHART_HEIGHT - 6}
                    >
                      {chartData[0]?.label ?? "Start"}
                    </text>
                    <text
                      fill="#111827"
                      fontSize="12"
                      fontWeight="700"
                      textAnchor="end"
                      x={CHART_WIDTH - CHART_PADDING}
                      y={CHART_HEIGHT - 6}
                    >
                      {chartData[chartData.length - 1]?.label ?? "Today"}
                    </text>
                    <text
                      fill="#5f9672"
                      fontSize="12"
                      fontWeight="800"
                      textAnchor="end"
                      x={CHART_WIDTH - CHART_PADDING}
                      y={18}
                    >
                      Max {chart.maxValue}
                    </text>
                  </svg>
                )}
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="rounded-[22px] border border-[#f0ded0] bg-white/82 p-7 shadow-[0_24px_70px_rgba(102,77,54,0.10)] backdrop-blur">
                <p className="text-xs font-black text-[#111827]">
                  Selected metric
                </p>
                <h2 className="mt-2 text-4xl font-black leading-none text-[#111827]">
                  {selectedMetric}
                </h2>
                <p className="mt-4 text-sm font-medium leading-6 text-[#111827]">
                  {selectedMetric === "Overall Score"
                    ? "This combines your daily actions, clean positive streaks, avoided negative actions, and trait growth."
                    : `${selectedMetric} is calculated from the actions that affect this trait over time.`}
                </p>

                {selectedTrait ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-[#fff4e8] p-4">
                      <p className="text-xs font-black text-[#111827]">Level</p>
                      <p className="mt-2 text-2xl font-black">
                        {selectedTrait.level}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#fff4e8] p-4">
                      <p className="text-xs font-black text-[#111827]">XP</p>
                      <p className="mt-2 text-2xl font-black">{selectedTrait.xp}</p>
                    </div>
                    <div className="rounded-xl bg-[#fff4e8] p-4">
                      <p className="text-xs font-black text-[#111827]">Actions</p>
                      <p className="mt-2 text-2xl font-black">
                        {selectedMetricActions.length}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-[#fff4e8] p-4">
                      <p className="text-xs font-black text-[#111827]">Today</p>
                      <p className="mt-2 text-2xl font-black">{score}%</p>
                    </div>
                    <div className="rounded-xl bg-[#fff4e8] p-4">
                      <p className="text-xs font-black text-[#111827]">Streak</p>
                      <p className="mt-2 text-2xl font-black">{streak}</p>
                    </div>
                    <div className="rounded-xl bg-[#fff4e8] p-4">
                      <p className="text-xs font-black text-[#111827]">Actions</p>
                      <p className="mt-2 text-2xl font-black">
                        {loadedActions.length}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[22px] border border-[#f0ded0] bg-white/82 p-7 shadow-[0_24px_70px_rgba(102,77,54,0.10)] backdrop-blur">
                <p className="text-xs font-black text-[#111827]">Selected day</p>
                <h2 className="mt-2 text-4xl font-black leading-none text-[#111827]">
                  {selectedDayLabel}
                </h2>
                <p className="mt-3 text-sm font-bold text-[#111827]">
                  {selectedDay}
                </p>

                <div className="mt-4 h-3.5 w-full overflow-hidden rounded-full bg-[#f8ece2]">
                  <div
                    className="h-full rounded-full bg-[#5f9672]"
                    style={{
                      width: `${getScoreBarPercent(
                        selectedPoint?.value ?? selectedDayScore
                      )}%`,
                    }}
                  />
                </div>

                <p className="mt-3 text-3xl font-black text-[#111827]">
                  {selectedPoint?.value ?? selectedDayScore}
                  {selectedMetric === "Overall Score" ? "%" : " XP"}
                </p>

                <div className="mt-5">
                  <h3 className="mb-3 text-lg font-black text-[#111827]">
                    Reflection
                  </h3>

                  <div className="min-h-32 rounded-xl border border-[#f0ded0] bg-[#FFFFFF] p-4 text-sm font-medium leading-6 text-[#111827]">
                    {selectedReflection ? (
                      <p className="whitespace-pre-wrap">{selectedReflection}</p>
                    ) : (
                      <p className="text-[#111827]">
                        No reflection saved for this day.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  {selectedTraitRows.length === 0 ? (
                    <p className="text-sm font-medium text-[#111827]">
                      No traits affected on this day.
                    </p>
                  ) : (
                    selectedTraitRows.map((row) => (
                      <div
                        key={row.trait}
                        className="flex items-center justify-between rounded-lg bg-[#fff4e8] px-4 py-2"
                      >
                        <span className="text-sm font-bold text-[#111827]">
                          {row.trait}
                        </span>
                        <span
                          className={`text-sm font-black ${
                            row.xp > 0 ? "text-[#111827]" : "text-red-500"
                          }`}
                        >
                          {row.xp > 0 ? "+" : ""}
                          {row.xp} XP
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
