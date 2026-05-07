"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
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
  getTraitImpact,
} from "../lib/characterArc";
import { supabase } from "../lib/supabase";

type ChartMetric = "Overall Score" | TraitName;

type ChartPoint = {
  date: string;
  label: string;
  value: number;
};

const STATS_TRAITS: TraitName[] = ["Kindness", "Confidence", "Discipline"];
const CHART_METRICS: ChartMetric[] = ["Overall Score", ...STATS_TRAITS];
const CHART_WIDTH = 720;
const CHART_HEIGHT = 260;
const CHART_PADDING = 28;

function buildDateRange(today: string, days: number) {
  return Array.from({ length: days }, (_value, index) =>
    getDateDaysAgo(today, days - 1 - index)
  );
}

function getMetricValue(metric: ChartMetric, date: string, actions: Action[]) {
  const actionsUpToDate = actions.filter((action) => action.date <= date);
  const dayActions = getActionsForDate(actions, date);

  if (metric === "Overall Score") {
    return calculateDailyScore(date, dayActions, actions);
  }

  return Math.max(0, getTraitImpact(actionsUpToDate)[metric]);
}

function buildChartData(metric: ChartMetric, actions: Action[]) {
  return buildDateRange(TODAY, 30).map((date) => ({
    date,
    label: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    value: getMetricValue(metric, date, actions),
  }));
}

function buildChartPath(points: ChartPoint[]) {
  const maxValue = Math.max(10, ...points.map((point) => point.value));
  const usableWidth = CHART_WIDTH - CHART_PADDING * 2;
  const usableHeight = CHART_HEIGHT - CHART_PADDING * 2;

  const coordinates = points.map((point, index) => {
    const x =
      CHART_PADDING +
      (points.length === 1 ? usableWidth : (index / (points.length - 1)) * usableWidth);
    const y =
      CHART_HEIGHT -
      CHART_PADDING -
      (point.value / maxValue) * usableHeight;

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
  };
}

export default function StatsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [actions, setActions] = useState<Action[] | null>(null);
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

  useEffect(() => {
    if (!user) return;

    void (async () => {
      const { data, error } = await supabase
        .from("daily_actions")
        .select("id, date, label, amount, user_id")
        .eq("user_id", user.id)
        .order("date", { ascending: true })
        .order("id", { ascending: true });

      if (error) {
        console.error("Stats actions load error:", error);
        setActions([]);
        return;
      }

      setActions(data ?? []);
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
  const chartData = useMemo(
    () => buildChartData(selectedMetric, loadedActions),
    [loadedActions, selectedMetric]
  );
  const chart = useMemo(() => buildChartPath(chartData), [chartData]);
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
      <main className="flex min-h-screen items-center justify-center bg-[#F6FBF4] p-6 text-[#1F3A2E]">
        <section className="w-full max-w-sm rounded-3xl border border-[#DDEBDD] bg-white p-8 text-center shadow-xl">
          <h1 className="text-3xl font-black">Stats</h1>
          <p className="mt-3 text-sm font-medium text-[#5F7A6B]">
            Sign in from CharacterArc to see your progress analytics.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex rounded-full bg-[#7BC47F] px-6 py-3 text-sm font-black text-white transition hover:bg-[#68b06c]"
          >
            Go home
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6FBF4] px-6 py-8 text-[#1F3A2E]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <Link
            href="/tracker"
            className="flex items-center gap-2 text-lg font-black transition hover:text-[#6BAA75]"
          >
            <span className="text-2xl">🌱</span>
            <span>CharacterArc</span>
          </Link>

          <Link
            href="/tracker"
            className="rounded-full border border-[#DDEBDD] bg-white px-5 py-2 text-sm font-bold text-[#5F7A6B] transition hover:bg-[#E8F5E9] hover:text-[#1F3A2E]"
          >
            Tracker
          </Link>
        </header>

        <section className="rounded-3xl border border-[#DDEBDD] bg-white p-8 shadow-xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight">Stats</h1>
              <p className="mt-2 text-sm font-medium text-[#5F7A6B]">
                Personality progress over time.
              </p>
            </div>

            <p className="text-sm font-bold text-[#5F7A6B]">{TODAY}</p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              ["Overall score", `${score}%`],
              ["Current streak", `${streak} days`],
              ["Positive actions", totals.positive],
              ["Negative actions", totals.negative],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-3xl bg-[#F6FBF4] p-5 transition hover:-translate-y-0.5 hover:bg-[#E8F5E9]"
              >
                <p className="text-xs font-black uppercase text-[#5F7A6B]">
                  {label}
                </p>
                <p className="mt-3 text-3xl font-black text-[#1F3A2E]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#DDEBDD] bg-white p-7 shadow-xl">
          <div className="flex flex-wrap gap-2">
            {CHART_METRICS.map((metric) => (
              <button
                key={metric}
                className={`rounded-full px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 ${
                  selectedMetric === metric
                    ? "bg-[#7BC47F] text-white shadow-sm"
                    : "bg-[#E8F5E9] text-[#5F7A6B] hover:text-[#1F3A2E]"
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

          <div className="mt-8 min-h-[320px] overflow-hidden rounded-3xl bg-[#F9FFF8] p-4">
            {isLoading ? (
              <div className="flex h-[292px] items-center justify-center text-sm font-bold text-[#5F7A6B]">
                Loading progress...
              </div>
            ) : loadedActions.length === 0 ? (
              <div className="flex h-[292px] items-center justify-center text-center text-sm font-bold leading-6 text-[#5F7A6B]">
                Add a few actions in the tracker to build your first chart.
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
                    <stop offset="0%" stopColor="#7BC47F" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#7BC47F" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {[0, 1, 2, 3].map((line) => {
                  const y =
                    CHART_PADDING +
                    line * ((CHART_HEIGHT - CHART_PADDING * 2) / 3);

                  return (
                    <line
                      key={line}
                      stroke="#DDEBDD"
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
                  stroke="#6BAA75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="5"
                />

                {chart.coordinates.map((point, index) => (
                  <circle
                key={`${point.date}-${index}`}
                    className="cursor-pointer transition-all duration-300"
                    cx={point.x}
                    cy={point.y}
                    fill="#F9FFF8"
                    r={index === chart.coordinates.length - 1 ? 5 : 3}
                    onClick={() => setSelectedPoint(point)}
                    stroke="#6BAA75"
                    strokeWidth="3"
                  >
                    <title>
                      {point.label}: {point.value}
                    </title>
                  </circle>
                ))}

                <text
                  fill="#5F7A6B"
                  fontSize="12"
                  fontWeight="700"
                  x={CHART_PADDING}
                  y={CHART_HEIGHT - 6}
                >
                  30 days
                </text>
                <text
                  fill="#5F7A6B"
                  fontSize="12"
                  fontWeight="700"
                  textAnchor="end"
                  x={CHART_WIDTH - CHART_PADDING}
                  y={CHART_HEIGHT - 6}
                >
                  Max {chart.maxValue}
                </text>
              </svg>
            )}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl bg-[#F6FBF4] p-5 lg:col-span-2">
              <p className="text-xs font-black uppercase text-[#5F7A6B]">
                Selected metric
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#1F3A2E]">
                {selectedMetric}
              </h2>
              <p className="mt-3 text-sm font-medium leading-6 text-[#5F7A6B]">
                {selectedMetric === "Overall Score"
                  ? "This combines your daily actions, clean positive streaks, avoided negative actions, and trait growth."
                  : `${selectedMetric} is calculated from the actions that affect this trait over time.`}
              </p>

              {selectedTrait ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase text-[#5F7A6B]">
                      Level
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {selectedTrait.level}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase text-[#5F7A6B]">
                      XP
                    </p>
                    <p className="mt-2 text-2xl font-black">{selectedTrait.xp}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase text-[#5F7A6B]">
                      Actions
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {selectedMetricActions.length}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase text-[#5F7A6B]">
                      Today
                    </p>
                    <p className="mt-2 text-2xl font-black">{score}%</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase text-[#5F7A6B]">
                      Streak
                    </p>
                    <p className="mt-2 text-2xl font-black">{streak}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase text-[#5F7A6B]">
                      Actions
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {loadedActions.length}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-[#F6FBF4] p-5">
              <p className="text-xs font-black uppercase text-[#5F7A6B]">
                Chart point
              </p>
              {selectedPoint ? (
                <>
                  <h3 className="mt-2 text-2xl font-black text-[#1F3A2E]">
                    {selectedPoint.label}
                  </h3>
                  <p className="mt-3 text-sm font-bold text-[#5F7A6B]">
                    {selectedPoint.date}
                  </p>
                  <p className="mt-4 text-4xl font-black text-[#1F3A2E]">
                    {selectedPoint.value}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm font-medium leading-6 text-[#5F7A6B]">
                  Click a dot in the chart to inspect that day.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleTraits.map((trait) => (
            <div
              key={trait.name}
              className="rounded-3xl border border-[#DDEBDD] bg-white p-6 shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-black text-[#1F3A2E]">{trait.name}</h2>
                <span className="text-xs font-black text-[#5F7A6B]">
                  Level {trait.level}
                </span>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#E8F5E9]">
                <div
                  className="h-full rounded-full bg-[#6BAA75] transition-all duration-500"
                  style={{ width: `${trait.progressPercent}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs font-bold text-[#5F7A6B]">
                <span>{trait.xp} XP</span>
                <span>{trait.monthlyTrendLabel}</span>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
