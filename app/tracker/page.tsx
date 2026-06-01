"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import Link from "next/link";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import {
  BarChart3,
  Frown,
  Heart,
  LogOut,
  MessageCircle,
  Smile,
  Sprout,
} from "lucide-react";
import {
  type Action,
  TODAY,
  TRACKER_ACTIONS,
  calculateDailyScore,
  calculateTraits,
  getActionRule,
  getActionsForDate,
  getConsistencyStreak,
  getDateDaysAgo,
  getInsights,
  getScoreBarPercent,
  getSelectedTraitRows,
  hasCleanPositiveDay,
} from "../lib/characterArc";
import { supabase } from "../lib/supabase";

type CalendarDateElement = HTMLElement & {
  value?: string;
};

type DailyReflectionRow = {
  date: string;
  content: string;
};

type TutorialStep = {
  id: string;
  title: string;
  text: string;
  targetRef: RefObject<HTMLElement | null>;
};

const TRACKER_TRAITS = ["Kindness", "Confidence", "Discipline"];
const TUTORIAL_STEP_IDS = [
  "today",
  "calendar",
  "selected-day",
  "traits",
  "daily-tracker",
] as const;
const MIN_REFLECTION_LENGTH = 3;

function getTrackerActionIcon(label: string) {
  if (label === "Helped someone") {
    return <Heart size={16} className="fill-[#2d8c68] text-[#2d8c68]" />;
  }

  if (label === "Complimented someone") {
    return <MessageCircle size={16} />;
  }

  if (label === "Insulted someone") {
    return <Smile size={16} />;
  }

  return <Frown size={16} />;
}

function getTrackerActionClass(tone: (typeof TRACKER_ACTIONS)[number]["tone"]) {
  const base =
    "tracker-action-button inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-lg px-6 text-sm font-black shadow-sm transition hover:-translate-y-0.5";

  if (tone === "kindness") {
    return `${base} bg-[#dcecdf] text-[#171c2d] disabled:opacity-50`;
  }

  if (tone === "confidence") {
    return `${base} bg-[#e8dcfb] text-[#171c2d] disabled:opacity-50`;
  }

  if (tone === "warning") {
    return `${base} bg-[#ffde82] text-[#111827]`;
  }

  return `${base} bg-[#ffb4a6] text-[#111827]`;
}

function getTrackerActionButtonText(label: string) {
  if (label === "Helped someone") return "Help someone";
  if (label === "Complimented someone") return "Compliment";
  return label.replace("someone", "").trim();
}

function groupActions(actions: Action[]) {
  return actions.reduce<Record<string, Action[]>>((groups, action) => {
    if (!groups[action.label]) groups[action.label] = [];
    groups[action.label].push(action);
    return groups;
  }, {});
}

function hasNegativeAction(actions: Action[]) {
  return actions.some((action) => getActionRule(action.label).weight < 0);
}

function clampPanelPosition(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function TutorialWalkthrough({
  currentIndex,
  onClose,
  onNext,
  steps,
}: {
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  steps: TutorialStep[];
}) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ height: 720, width: 1024 });
  const step = steps[currentIndex];

  useEffect(() => {
    if (!step?.targetRef.current) return;

    const target = step.targetRef.current;
    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    const updateTargetRect = () => {
      setTargetRect(target.getBoundingClientRect());
      setViewport({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    };

    const frame = window.setTimeout(updateTargetRect, 260);
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, { passive: true });

    return () => {
      window.clearTimeout(frame);
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect);
    };
  }, [step]);

  if (!step || !targetRect) return null;

  const isMobile = viewport.width < 768;
  const canPlaceRight = targetRect.right + 344 < viewport.width;
  const canPlaceLeft = targetRect.left - 344 > 0;
  const placement = isMobile
    ? "bottom"
    : canPlaceRight
    ? "right"
    : canPlaceLeft
    ? "left"
    : "bottom";
  const panelWidth = isMobile ? Math.min(viewport.width - 32, 340) : 320;
  const panelLeft =
    placement === "right"
      ? targetRect.right + 24
      : placement === "left"
      ? targetRect.left - panelWidth - 24
      : clampPanelPosition(
          targetRect.left + targetRect.width / 2 - panelWidth / 2,
          16,
          viewport.width - panelWidth - 16
        );
  const panelTop =
    placement === "bottom"
      ? clampPanelPosition(targetRect.bottom + 18, 16, viewport.height - 230)
      : clampPanelPosition(
          targetRect.top + targetRect.height / 2 - 110,
          16,
          viewport.height - 230
        );
  const arrow =
    placement === "right" ? "<-" : placement === "left" ? "->" : "^";
  const isLastStep = currentIndex === steps.length - 1;

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      <div
        className="tutorial-callout pointer-events-auto fixed w-[var(--tutorial-width)] rounded-[22px] border border-[#f0ded0] bg-white/95 p-5 text-[#171c2d] shadow-[0_24px_70px_rgba(18,24,38,0.22)] backdrop-blur"
        style={
          {
            "--tutorial-width": `${panelWidth}px`,
            left: panelLeft,
            top: panelTop,
          } as React.CSSProperties
        }
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <span className="rounded-full bg-[#eef7ee] px-3 py-1 text-xs font-black text-[#5f9672]">
            {currentIndex + 1} / {steps.length}
          </span>
          <span className="text-xl font-black text-[#5f9672]">{arrow}</span>
        </div>

        <h2 className="text-2xl font-black leading-tight">{step.title}</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#3d4556]">
          {step.text}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            className="rounded-full px-4 py-2 text-sm font-black text-[#6e7583] transition hover:bg-[#fff4e8] hover:text-[#171c2d]"
            onClick={onClose}
          >
            Skip
          </button>
          <button
            className="rounded-full bg-[#5f9672] px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#4f8763]"
            onClick={onNext}
          >
            {isLastStep ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
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
  const [isReflectionPanelOpen, setIsReflectionPanelOpen] = useState(false);
  const [reflectionDraft, setReflectionDraft] = useState("");
  const [isSavingReflection, setIsSavingReflection] = useState(false);
  const [reflectionSaveMessage, setReflectionSaveMessage] = useState("");

  const actionSoundRef = useRef<HTMLAudioElement | null>(null);
  const calendarRef = useRef<CalendarDateElement | null>(null);
  const traitsPanelRef = useRef<HTMLElement | null>(null);
  const dailyTrackerPanelRef = useRef<HTMLElement | null>(null);
  const todayPanelRef = useRef<HTMLElement | null>(null);
  const selectedDayPanelRef = useRef<HTMLElement | null>(null);
  const undoInProgressRef = useRef(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);

  const tutorialSteps = useMemo<TutorialStep[]>(
    () => [
      {
        id: "today",
        title: "Your day panel",
        text: "This is where you log actions and see today's score move.",
        targetRef: todayPanelRef,
      },
      {
        id: "calendar",
        title: "Your calendar",
        text: "Pick a date to look back at what happened that day.",
        targetRef: calendarRef,
      },
      {
        id: "selected-day",
        title: "Selected day",
        text: "This panel shows saved actions, trait changes, and reflections.",
        targetRef: selectedDayPanelRef,
      },
      {
        id: "traits",
        title: "Your traits",
        text: "Your actions add XP to traits like kindness and discipline.",
        targetRef: traitsPanelRef,
      },
      {
        id: "daily-tracker",
        title: "Daily tracker",
        text: "This shows your streak and quick insights from your history.",
        targetRef: dailyTrackerPanelRef,
      },
    ],
    []
  );
  const activeTutorialTarget = isTutorialOpen
    ? TUTORIAL_STEP_IDS[tutorialStepIndex]
    : "";
  const getTutorialClass = (id: string) =>
    isTutorialOpen
      ? id === activeTutorialTarget
        ? "tutorial-focus"
        : "tutorial-soft-blur"
      : "";

  function finishTutorial() {
    if (user) {
      window.localStorage.setItem(`characterarc-tutorial-seen-${user.id}`, "true");
    }

    setIsTutorialOpen(false);
  }

  function goToNextTutorialStep() {
    if (tutorialStepIndex >= tutorialSteps.length - 1) {
      finishTutorial();
      return;
    }

    setTutorialStepIndex((current) => current + 1);
  }

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

  async function loadReflections(currentUser: User) {
    const { data, error } = await supabase
      .from("daily_reflections")
      .select("date, content")
      .eq("user_id", currentUser.id);

    if (error) {
      console.warn("Load reflections warning:", JSON.stringify(error, null, 2));
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

  async function saveReflection(
    date: string,
    content: string,
    options: { closePanel?: boolean } = {}
  ) {
    if (!user || isSavingReflection) return;

    setIsSavingReflection(true);
    setReflectionSaveMessage("");

    const { error } = await supabase.from("daily_reflections").upsert(
      {
        content,
        date,
        user_id: user.id,
      },
      { onConflict: "user_id,date" }
    );

    setIsSavingReflection(false);

    if (error) {
      console.error("Save reflection error:", error);
      setReflectionSaveMessage("Could not save reflection. Check the table SQL.");
      return;
    }

    setReflections((currentReflections) => ({
      ...currentReflections,
      [date]: content,
    }));
    setReflectionSaveMessage("Reflection saved.");

    if (date === today && content.trim().length >= MIN_REFLECTION_LENGTH) {
      setAntiGamingMessage("");
      setCooldownAction(null);
    }

    if (options.closePanel ?? true) {
      setIsReflectionPanelOpen(false);
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
      reflection.length < MIN_REFLECTION_LENGTH
    ) {
      setAntiGamingMessage(
        "Add a quick reflection before repeating that high-impact action again today."
      );
      return;
    }

    setAntiGamingMessage("");

    if (actionSoundRef.current) {
      actionSoundRef.current.pause();
      actionSoundRef.current.currentTime = 0;

      void actionSoundRef.current.play().catch((error) => {
        console.error("Sound play error:", error);
      });
    }

    if (rule.weight > 0) {
      setCooldownAction(label);

      setTimeout(() => {
        setCooldownAction(null);
      }, repeatCount > 0 ? 2000 : 1000);
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
  const visibleTraits = useMemo(
    () => traits.filter((trait) => TRACKER_TRAITS.includes(trait.name)),
    [traits]
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
  const achievements = visibleTraits
    .filter((trait) => trait.level >= 3)
    .map((trait) => `${trait.name} L${trait.level}`)
    .slice(0, 4);
  const selectedReflection = reflections[selectedDate] ?? "";
  const todayReflection = reflections[today] ?? "";
  const calendarHeading = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    }
  );
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
    actionSoundRef.current = new Audio("/click.wav");
    actionSoundRef.current.volume = 0.45;

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

    const storageKey = `characterarc-tutorial-seen-${user.id}`;

    if (window.localStorage.getItem(storageKey) === "true") return;

    const frame = window.requestAnimationFrame(() => {
      setTutorialStepIndex(0);
      setIsTutorialOpen(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [user]);

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

      const databaseReflections = await loadReflections(user);

      setReflections((currentReflections) => ({
        ...currentReflections,
        ...databaseReflections,
      }));

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
      <main className="flex min-h-screen items-center justify-center bg-[#fff8ee] p-6 text-[#171c2d]">
        <div className="w-full max-w-sm rounded-3xl border border-[#f0ded0] bg-white/90 p-8 text-center shadow-[0_24px_70px_rgba(102,77,54,0.12)]">
          <Image
            src="/characterarc-icon.png"
            alt="CharacterArc"
            width={88}
            height={88}
            className="mx-auto rounded-[22px] shadow-[0_14px_32px_rgba(7,174,234,0.2)]"
            priority
          />

          <h1 className="mt-4 text-3xl font-black">CharacterArc</h1>

          <p className="mt-3 text-[#111827]">
            Sign in to start tracking your real-life character score.
          </p>

          <button
            className="mt-8 w-full rounded-full bg-[#5f9672] px-6 py-4 font-black text-white shadow-lg transition hover:scale-105 hover:bg-[#4f8763]"
            onClick={signInWithGoogle}
          >
            Continue with Google
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="tracker-page relative min-h-screen overflow-hidden bg-[#fff8ee] px-4 py-6 text-[#171c2d] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-40 rounded-[60%_40%_55%_45%/45%_58%_42%_55%] bg-[#f6dccb]" />
      <div className="pointer-events-none absolute -right-20 top-0 h-80 w-48 rounded-[45%_55%_51%_49%/50%_55%_45%_50%] bg-[#dcecdf]" />
      <div className="pointer-events-none absolute -bottom-10 left-4 h-56 w-80 rounded-[60%_40%_42%_58%/58%_45%_55%_42%] bg-[#fff1d2]" />
      <div className="pointer-events-none absolute -bottom-16 -right-14 h-40 w-44 rounded-[48%_52%_46%_54%/48%_53%_47%_52%] bg-[#ffb4a6]" />

      <div className="relative mx-auto w-full max-w-[1380px]">
        <header
          className={`mb-5 flex min-h-14 w-full items-center justify-between overflow-visible px-4 py-1 ${isTutorialOpen ? "tutorial-soft-blur" : ""}`}
        >
  <div className="flex h-12 items-center gap-3 px-1 text-lg font-black">
    <Image
      src="/characterarc-icon.png"
      alt="CharacterArc"
      width={38}
      height={38}
      className="shrink-0 rounded-xl shadow-sm"
      priority
    />
    <span>CA</span>
  </div>

  <nav className="flex items-center gap-3 overflow-visible" aria-label="Account navigation">
    <Link
      href="/stats"
      className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#f0ded0] bg-white/90 text-[#171c2d] shadow-[0_10px_20px_rgba(102,77,54,0.10)] transition hover:-translate-y-0.5 hover:bg-[#fff4e8]"
      aria-label="Stats"
      title="Stats"
    >
      <BarChart3 size={21} strokeWidth={2.4} />
    </Link>

    <button
      type="button"
      className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#f0ded0] bg-white/90 text-[#171c2d] shadow-[0_10px_20px_rgba(102,77,54,0.10)] transition hover:-translate-y-0.5 hover:bg-[#fff4e8]"
      onClick={signOut}
      aria-label="Logout"
      title="Logout"
    >
      <LogOut size={21} strokeWidth={2.4} />
    </button>
  </nav>
</header>

<div className="grid w-full grid-cols-1 items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-5">
  <aside className="flex flex-col gap-4 lg:col-start-1">
  {/* Traits */}
  <section
    ref={traitsPanelRef}
    className={`h-fit rounded-[22px] border border-[#f0ded0] bg-white/82 p-6 shadow-[0_24px_70px_rgba(102,77,54,0.10)] backdrop-blur ${getTutorialClass("traits")}`}
  >
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff1d2] text-[0px] text-[#171c2d]">
        <Sprout size={22} className="text-[#171c2d]" />
        ✨
      </div>

      <h2 className="text-2xl font-black text-[#111827]">Traits</h2>
    </div>

    <div className="space-y-5">
      {visibleTraits.map((trait) => (
        <div
          key={trait.name}
          className={
            lastMilestone.startsWith(trait.name)
              ? "animate-pulse rounded-2xl bg-[#fff4e8] p-2 transition"
              : ""
          }
        >
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
              className={`h-full rounded-full ${
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
            <span>
              Today {trait.dailyXp >= 0 ? "+" : ""}
              {trait.dailyXp} XP
            </span>
          </div>

          <p className="mt-1 text-[11px] font-bold text-[#111827]">
            {trait.monthlyTrendLabel}
          </p>
        </div>
      ))}
    </div>

    {lastMilestone && (
      <p className="mt-6 rounded-2xl bg-[#fff4e8] px-4 py-3 text-sm font-black text-[#111827]">
        {lastMilestone}
      </p>
    )}

    {achievements.length > 0 && (
      <div className="mt-5 flex flex-wrap gap-2">
        {achievements.map((achievement) => (
          <span
            key={achievement}
            className="rounded-full bg-[#fff4e8] px-3 py-1 text-xs font-black text-[#111827]"
          >
            {achievement}
          </span>
        ))}
      </div>
    )}
  </section>

  {/* Daily tracker */}
  <section
    ref={dailyTrackerPanelRef}
    className={`overflow-hidden rounded-[22px] border border-[#f0ded0] bg-white/82 p-6 shadow-[0_24px_70px_rgba(102,77,54,0.10)] backdrop-blur ${getTutorialClass("daily-tracker")}`}
  >
    <div className="flex items-center">
      <h2 className="text-2xl font-black leading-tight text-[#111827]">
        Daily tracker
      </h2>
    </div>

    <div className="mt-6 flex items-end gap-2">
      <p className="text-5xl font-black leading-none text-[#111827]">
        {currentStreak}
      </p>
      <p className="pb-2 text-lg font-bold text-[#111827]">days</p>
    </div>

    <p className="mt-3 text-sm font-medium leading-6 text-[#111827]">
      {currentStreak > 0
        ? "Clean positive streak based on your action history."
        : "Start by logging your first action today."}
    </p>

    <div className="mt-5 grid grid-cols-7 gap-2 text-center">
      {weekDots.map((day) => (
        <button
          key={day.date}
          className="flex flex-col items-center gap-2 rounded-xl py-1 transition hover:bg-[#fff4e8]"
          onClick={() => void loadSelectedDay(day.date, user)}
          title={`View ${day.date}`}
        >
          <span className="text-xs font-black text-[#111827]">
            {new Date(`${day.date}T00:00:00`)
              .toLocaleDateString("en-US", { weekday: "short" })
              .charAt(0)}
          </span>

          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${
              day.hasActions
                ? "bg-[#5f9672] text-white shadow-sm"
                : "bg-[#fff4e8] text-[#111827]"
            } ${selectedDate === day.date ? "ring-2 ring-[#f0cbb7]" : ""}`}
          >
            {day.hasActions ? "✓" : "-"}
          </div>
        </button>
      ))}
    </div>

    <div className="mt-5 space-y-2">
      {insights.length === 0 ? (
        <p className="text-sm font-medium leading-6 text-[#111827]">
          Insights will appear as your history grows.
        </p>
      ) : (
        insights.map((insight) => (
          <p
            key={insight}
            className="rounded-xl bg-[#fff4e8] px-4 py-2.5 text-sm font-bold leading-5 text-[#111827]"
          >
            {insight}
          </p>
        ))
      )}
    </div>
  </section>
  </aside>

  <div className="flex min-w-0 flex-col gap-4 lg:col-start-2">

  {/* Today */}
  <section
    ref={todayPanelRef}
    className={`relative flex min-h-[300px] w-full flex-col justify-center overflow-hidden rounded-[22px] border border-[#f0ded0] bg-white/82 px-10 py-7 shadow-[0_24px_70px_rgba(102,77,54,0.10)] backdrop-blur ${getTutorialClass("today")}`}
  >
    <div className="absolute left-7 top-5 flex justify-start">
      <button
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff4e8] text-base font-black text-[#111827] transition hover:bg-[#f6dccb] disabled:opacity-50"
        onClick={undoLastAction}
        disabled={isUndoing}
        title="Undo last action"
      >
        ↩
      </button>
    </div>

    <button
      type="button"
      className="absolute right-7 top-5 z-30 rounded-full border border-[#f0ded0] bg-[#FFFFFF] px-5 py-2 text-xs font-black text-[#111827] shadow-[0_8px_18px_rgba(102,77,54,0.10)] transition hover:bg-[#fff4e8]"
      onClick={() => {
        setReflectionDraft(todayReflection);
        setReflectionSaveMessage("");
        setIsReflectionPanelOpen(true);
      }}
    >
      Add reflect
    </button>

    <div className="relative z-10 w-full">
      <p className="mb-5 pl-12 text-sm font-black text-[#171c2d]">
        Good morning <Sprout className="inline text-[#5f9672]" size={17} />
      </p>

      <div className="mx-auto max-w-[660px] text-center">
        <h1 className="mx-auto max-w-[650px] text-4xl font-black leading-tight tracking-tight md:text-[2.75rem]">
          Today is a new chance to grow.
        </h1>

        <div className="mx-auto mt-7 h-3 w-full max-w-[560px] overflow-hidden rounded-full bg-[#f8ece2]">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              progressEffect === "loss"
                ? "bg-red-500"
                : progressEffect === "gain"
                ? "bg-[#5f9672]"
                : "bg-[#5f9672]"
            }`}
            style={{ width: `${getScoreBarPercent(progress)}%` }}
          />
        </div>

        <p className="mt-5 text-4xl font-black leading-none">{progress}%</p>

        <p className="mt-2 text-sm font-medium text-[#8c8177]">
          Your daily personality score
        </p>

        <div className="mx-auto mt-7 flex max-w-3xl flex-wrap justify-center gap-3">
          {TRACKER_ACTIONS.map((action) => (
            <button
              key={action.label}
              className={getTrackerActionClass(action.tone)}
              onClick={() => addAction(action.label, action.amount)}
              disabled={
                action.amount > 0 && cooldownAction === action.label
              }
            >
              {getTrackerActionIcon(action.label)}
              {getTrackerActionButtonText(action.label)}
            </button>
          ))}
        </div>
      </div>
    </div>

    {antiGamingMessage && (
      <p className="mt-4 text-sm font-bold text-[#111827]">
        {antiGamingMessage}
      </p>
    )}
  </section>

  {/* Calendar */}
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
        "--color-primary": "#f0cbb7",
        "--color-primary-content": "#171c2d",
        "--p": "129 8% 68%",
        "--pc": "151 30% 17%",
        "--fallback-p": "#f0cbb7",
        "--fallback-pc": "#171c2d",
        "--btn-fg": "#171c2d",
      } as React.CSSProperties
    }
    className={`cally dashboard-calendar w-full rounded-[22px] border border-[#f0ded0] bg-white/82 px-8 py-7 text-[#171c2d] shadow-[0_24px_70px_rgba(102,77,54,0.10)] backdrop-blur ${getTutorialClass("calendar")}`}
  >
    <span slot="heading" className="dashboard-calendar-heading">
      {calendarHeading}
    </span>

    <svg
      aria-label="Previous"
      className="size-8 rounded-full bg-[#f6dccb] p-2 text-[#171c2d]"
      slot="previous"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>

    <svg
      aria-label="Next"
      className="size-8 rounded-full bg-[#f6dccb] p-2 text-[#171c2d]"
      slot="next"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>

    <calendar-month></calendar-month>
  </calendar-date>

  {/* Selected day */}
  <section
    ref={selectedDayPanelRef}
    className={`dashboard-selected relative w-full overflow-hidden rounded-[22px] border border-[#f0ded0] bg-white/82 p-8 shadow-[0_24px_70px_rgba(102,77,54,0.10)] backdrop-blur ${getTutorialClass("selected-day")}`}
  >
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
      <div className="relative z-10">
        <h2 className="text-4xl font-black leading-none md:text-5xl">
          Selected day
        </h2>

        <p className="mt-3 text-sm font-semibold text-[#111827]">
          {selectedDate}
        </p>

        <div className="mt-4 h-3.5 w-full max-w-[430px] overflow-hidden rounded-full bg-[#f8ece2]">
          <div
            className="h-full rounded-full bg-[#5f9672]"
            style={{ width: `${getScoreBarPercent(selectedProgress)}%` }}
          />
        </div>

        <p className="mt-3 text-2xl font-black">{selectedProgress}%</p>

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

      <div className="relative z-10 border-[#f0cbb7] lg:border-l lg:pl-8">
        <div className="grid w-full grid-cols-1 gap-5">
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-lg font-black text-[#111827]">
              <Sprout size={18} className="text-[#5f9672]" />
              Good actions
            </h3>

            {goodActions.length === 0 ? (
              <p className="text-sm text-[#111827]">No good actions saved.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(groupedGoodActions).map(([label, actions]) => (
                  <details
                    key={label}
                    className="collapse collapse-arrow rounded-xl bg-[#fff4e8]"
                  >
                    <summary className="collapse-title min-h-0 py-4 font-bold">
                      {label} x {actions.length}
                    </summary>

                    <div className="collapse-content space-y-2">
                      {actions.map((action) => (
                        <div
                          key={action.id}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm">{action.label}</span>
                          <span className="font-black text-[#111827]">
                            +{action.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3 flex items-center gap-2 text-lg font-black text-red-500">
              <Sprout size={18} className="text-[#ff9c8c]" />
              Bad actions
            </h3>

            {badActions.length === 0 ? (
              <p className="text-sm text-[#111827]">No bad actions saved.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(groupedBadActions).map(([label, actions]) => (
                  <details
                    key={label}
                    className="collapse collapse-arrow rounded-xl bg-[#FFF1F1]"
                  >
                    <summary className="collapse-title min-h-0 py-4 font-bold">
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
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-[#111827]">
              Reflection
            </h3>

            <button
              className="rounded-full bg-[#5f9672] px-5 py-2 text-xs font-black text-white shadow-sm transition hover:bg-[#4f8763] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() =>
                void saveReflection(selectedDate, selectedReflection.trim(), {
                  closePanel: false,
                })
              }
              disabled={isSavingReflection}
            >
              {isSavingReflection ? "Saving..." : "Save"}
            </button>
          </div>

          <textarea
            className="min-h-16 w-full resize-none rounded-xl border border-[#f0cbb7] bg-[#FFFFFF] p-3 text-sm font-medium leading-6 text-[#111827] outline-none transition focus:border-[#dca988]"
            placeholder="Write your reflection..."
            value={selectedReflection}
            onChange={(event) => {
              const note = event.target.value;

              setReflections((currentReflections) => ({
                ...currentReflections,
                [selectedDate]: note,
              }));

              if (
                selectedDate === today &&
                note.trim().length >= MIN_REFLECTION_LENGTH
              ) {
                setAntiGamingMessage("");
              }
            }}
          />

          {reflectionSaveMessage && !isReflectionPanelOpen && (
            <p className="mt-2 text-sm font-bold text-[#111827]">
              {reflectionSaveMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  </section>

  {/* Daily tracker */}
  <section className="hidden">
    <div className="flex items-center">
      <h2 className="text-2xl font-black leading-tight text-[#111827]">
        Daily tracker
      </h2>
    </div>

    <div className="mt-6 flex items-end gap-2">
      <p className="text-5xl font-black leading-none text-[#111827]">
        {currentStreak}
      </p>
      <p className="pb-2 text-lg font-bold text-[#111827]">days</p>
    </div>

    <p className="mt-3 text-sm font-medium leading-6 text-[#111827]">
      {currentStreak > 0
        ? "Clean positive streak based on your action history."
        : "Start by logging your first action today."}
    </p>

    <div className="mt-5 grid grid-cols-7 gap-2 text-center">
      {weekDots.map((day) => (
        <div key={day.date} className="flex flex-col items-center gap-2">
          <span className="text-xs font-black text-[#111827]">
            {new Date(`${day.date}T00:00:00`)
              .toLocaleDateString("en-US", { weekday: "short" })
              .charAt(0)}
          </span>

          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${
              day.hasActions
                ? "bg-[#5f9672] text-white shadow-sm"
                : "bg-[#fff4e8] text-[#111827]"
            }`}
          >
            {day.hasActions ? "✓" : "-"}
          </div>
        </div>
      ))}
    </div>

    <div className="mt-5 space-y-2">
      {insights.length === 0 ? (
        <p className="text-sm font-medium leading-6 text-[#111827]">
          Insights will appear as your history grows.
        </p>
      ) : (
        insights.map((insight) => (
          <p
            key={insight}
            className="rounded-xl bg-[#fff4e8] px-4 py-2.5 text-sm font-bold leading-5 text-[#111827]"
          >
            {insight}
          </p>
        ))
      )}
    </div>
  </section>
</div>
        </div>
      </div>

      {isTutorialOpen && (
        <TutorialWalkthrough
          currentIndex={tutorialStepIndex}
          onClose={finishTutorial}
          onNext={goToNextTutorialStep}
          steps={tutorialSteps}
        />
      )}

      {isReflectionPanelOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111827]/30 p-4 backdrop-blur-sm">
          <section className="w-full max-w-xl rounded-[22px] border border-[#f0ded0] bg-white p-6 text-[#111827] shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black leading-none">Reflection</h2>
                <p className="mt-2 text-sm font-bold text-[#111827]">{today}</p>
              </div>

              <button
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff4e8] text-lg font-black transition hover:bg-[#f6dccb]"
                onClick={() => setIsReflectionPanelOpen(false)}
                aria-label="Close reflection panel"
              >
                x
              </button>
            </div>

            <textarea
              className="mt-6 min-h-52 w-full resize-none rounded-2xl border border-[#f0cbb7] bg-[#FFFFFF] p-4 text-sm font-medium leading-6 text-[#111827] outline-none transition focus:border-[#dca988]"
              placeholder="Write what happened today..."
              value={reflectionDraft}
              onChange={(event) => {
                const note = event.target.value;

                setReflectionDraft(note);

                if (note.trim().length >= MIN_REFLECTION_LENGTH) {
                  setAntiGamingMessage("");
                }
              }}
            />

            {reflectionSaveMessage && (
              <p className="mt-3 text-sm font-bold text-[#111827]">
                {reflectionSaveMessage}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                className="rounded-full border border-[#f0ded0] bg-white px-5 py-3 text-sm font-black text-[#111827] transition hover:bg-[#fff4e8] hover:text-[#111827]"
                onClick={() => setIsReflectionPanelOpen(false)}
              >
                Cancel
              </button>

              <button
                className="rounded-full bg-[#5f9672] px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#4f8763] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void saveReflection(today, reflectionDraft.trim())}
                disabled={isSavingReflection}
              >
                {isSavingReflection ? "Saving..." : "Save"}
              </button>
            </div>
          </section>
        </div>
      )}

      <style>{`
  calendar-date {
    --color-primary: #f0cbb7 !important;
    --color-primary-content: #171c2d !important;
    --color-accent: #f0cbb7 !important;
    --color-text-on-accent: #171c2d !important;
    --p: 129 8% 68% !important;
    --pc: 151 30% 17% !important;
    --fallback-p: #f0cbb7 !important;
    --fallback-pc: #171c2d !important;
  }

  .dashboard-calendar {
    display: block;
  }

  .dashboard-calendar::part(container) {
    align-items: stretch;
    width: 100%;
  }

  .dashboard-calendar::part(header) {
    align-items: center;
    width: 100%;
  }

  .dashboard-calendar::part(heading) {
    line-height: 1;
  }

  .dashboard-calendar-heading {
    font-size: 1.65rem;
    font-weight: 900;
    line-height: 1;
  }

  .dashboard-calendar calendar-month {
    display: block;
    height: auto;
    inline-size: 100%;
    margin-inline: 0;
  }

  .dashboard-calendar calendar-month::part(table) {
    table-layout: fixed;
    width: 100%;
  }

  .dashboard-calendar calendar-month::part(col-1),
  .dashboard-calendar calendar-month::part(col-2),
  .dashboard-calendar calendar-month::part(col-3),
  .dashboard-calendar calendar-month::part(col-4),
  .dashboard-calendar calendar-month::part(col-5),
  .dashboard-calendar calendar-month::part(col-6),
  .dashboard-calendar calendar-month::part(col-7) {
    width: 14.285%;
  }

  .dashboard-calendar calendar-month::part(th),
  .dashboard-calendar calendar-month::part(td) {
    inline-size: auto;
    text-align: center;
  }

  .dashboard-calendar calendar-month::part(th) {
    font-size: 0.9rem;
    font-weight: 900;
  }

  .dashboard-calendar svg[slot="previous"],
  .dashboard-calendar svg[slot="next"] {
    height: 1.75rem;
    width: 1.75rem;
  }

  .dashboard-selected .collapse-title {
    min-height: 0;
  }

  calendar-month::part(day) {
    align-items: center;
    border-radius: 9999px;
    block-size: 2.25rem;
    color: #111827;
    display: inline-flex;
    inline-size: 100%;
    justify-content: center;
    min-inline-size: 0;
  }

  calendar-month::part(day selected) {
    background-color: #f0cbb7 !important;
    color: #171c2d !important;
  }

  calendar-month::part(day today),
  calendar-month::part(day today selected) {
    background-color: #dcecdf !important;
    color: #315f43 !important;
  }
`}</style>
    </main>
  );
}
