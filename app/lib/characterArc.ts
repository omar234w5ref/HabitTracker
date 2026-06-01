export type Action = {
  id: number;
  date: string;
  label: string;
  amount: number;
  user_id: string;
};

export type TraitName =
  | "Kindness"
  | "Confidence"
  | "Empathy"
  | "Discipline"
  | "Respectfulness"
  | "Resilience";

export type TraitDelta = Partial<Record<TraitName, number>>;

export type ActionRule = {
  weight: number;
  traits: TraitDelta;
  reflectionRequiredAfter?: number;
};

export type TraitProgress = {
  name: TraitName;
  xp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
  dailyXp: number;
  monthlyXp: number;
  monthlyChangePercent: number | null;
  monthlyTrendLabel: string;
};

export const TRAITS: TraitName[] = [
  "Kindness",
  "Confidence",
  "Empathy",
  "Discipline",
  "Respectfulness",
  "Resilience",
];

export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 850, 1300, 1850, 2500, 3250, 4100,
];
export const MIN_MONTHLY_TREND_BASELINE = 50;

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export const TODAY = formatDateOnly(new Date());

export const ACTION_RULES: Record<string, ActionRule> = {
  "Helped someone": {
    weight: 15,
    traits: {
      Kindness: 15,
      Empathy: 10,
      Respectfulness: 8,
      Discipline: 3,
    },
    reflectionRequiredAfter: 2,
  },
  "Help someone": {
    weight: 15,
    traits: {
      Kindness: 15,
      Empathy: 10,
      Respectfulness: 8,
      Discipline: 3,
    },
    reflectionRequiredAfter: 2,
  },
  "Complimented someone": {
    weight: 10,
    traits: {
      Confidence: 10,
      Kindness: 6,
      Empathy: 4,
      Discipline: 2,
    },
  },
  Compliment: {
    weight: 10,
    traits: {
      Confidence: 10,
      Kindness: 6,
      Empathy: 4,
      Discipline: 2,
    },
  },
  "Insulted someone": {
    weight: -12,
    traits: {
      Respectfulness: -12,
      Empathy: -8,
      Confidence: -3,
      Discipline: -4,
    },
  },
  Insult: {
    weight: -12,
    traits: {
      Respectfulness: -12,
      Empathy: -8,
      Confidence: -3,
      Discipline: -4,
    },
  },
  "Acted negatively": {
    weight: -25,
    traits: {
      Kindness: -25,
      Empathy: -20,
      Respectfulness: -25,
      Discipline: -8,
      Resilience: -8,
    },
    reflectionRequiredAfter: 0,
  },
};

export const TRACKER_ACTIONS = [
  {
    label: "Helped someone",
    amount: 20,
    tone: "kindness",
  },
  {
    label: "Complimented someone",
    amount: 10,
    tone: "confidence",
  },
  {
    label: "Insulted someone",
    amount: -10,
    tone: "warning",
  },
  {
    label: "Acted negatively",
    amount: -20,
    tone: "negative",
  },
] as const;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function getScoreBarPercent(score: number) {
  return clamp(score, 0, 100);
}

export function getActionRule(label: string) {
  return (
    ACTION_RULES[label] ?? {
      weight: 0,
      traits: {},
    }
  );
}

export function getRepeatMultiplier(repeatIndex: number) {
  if (repeatIndex === 0) return 1;
  if (repeatIndex === 1) return 0.75;
  if (repeatIndex === 2) return 0.5;
  return 0.25;
}

export function getEffectiveActions(actions: Action[]) {
  const counts: Record<string, number> = {};

  return [...actions]
    .sort((a, b) => a.id - b.id)
    .map((action) => {
      const repeatIndex = counts[action.label] ?? 0;
      counts[action.label] = repeatIndex + 1;

      return {
        action,
        multiplier: getRepeatMultiplier(repeatIndex),
        rule: getActionRule(action.label),
      };
    });
}

export function getTraitImpact(actions: Action[]) {
  return getEffectiveActions(actions).reduce<Record<TraitName, number>>(
    (impact, { multiplier, rule }) => {
      TRAITS.forEach((trait) => {
        impact[trait] += Math.round((rule.traits[trait] ?? 0) * multiplier);
      });

      return impact;
    },
    {
      Kindness: 0,
      Confidence: 0,
      Empathy: 0,
      Discipline: 0,
      Respectfulness: 0,
      Resilience: 0,
    }
  );
}

export function getTraitLevel(xp: number) {
  let level = 1;

  LEVEL_THRESHOLDS.forEach((threshold, index) => {
    if (xp >= threshold) level = index + 1;
  });

  const currentLevelXp = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextLevelXp =
    LEVEL_THRESHOLDS[level] ??
    LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] ??
    4100;
  const progressPercent =
    level >= 10
      ? 100
      : Math.round(
          ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
        );

  return {
    level,
    currentLevelXp,
    nextLevelXp,
    progressPercent: clamp(progressPercent, 0, 100),
  };
}

export function getDateDaysAgo(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const nextDate = new Date(year, (month ?? 1) - 1, day ?? 1);
  nextDate.setDate(nextDate.getDate() - days);
  return formatDateOnly(nextDate);
}

export function getActionsForDate(actions: Action[], date: string) {
  return actions.filter((action) => action.date === date);
}

export function hasCleanPositiveDay(actions: Action[]) {
  return (
    actions.some((action) => getActionRule(action.label).weight > 0) &&
    !actions.some((action) => getActionRule(action.label).weight < 0)
  );
}

export function getConsistencyStreak(actions: Action[], endDate: string) {
  let streak = 0;

  for (let index = 0; index < 365; index += 1) {
    const date = getDateDaysAgo(endDate, index);
    const dayActions = getActionsForDate(actions, date);

    if (!hasCleanPositiveDay(dayActions)) break;
    streak += 1;
  }

  return streak;
}

export function getPreviousConsistencyStreak(actions: Action[], date: string) {
  return getConsistencyStreak(actions, getDateDaysAgo(date, 1));
}

export function calculateDailyScore(
  date: string,
  dayActions: Action[],
  allActions: Action[]
) {
  if (dayActions.length === 0) return 0;

  const weightedScore = getEffectiveActions(dayActions).reduce(
    (sum, { multiplier, rule }) => sum + Math.round(rule.weight * multiplier),
    0
  );
  const hasNegativeAction = dayActions.some(
    (action) => getActionRule(action.label).weight < 0
  );
  const negativeAvoidedBonus = hasNegativeAction ? 0 : 8;
  const streakBonus = Math.min(
    getPreviousConsistencyStreak(allActions, date) * 2,
    20
  );
  const traitGrowthBonus = Math.min(
    Math.round(
      Object.values(getTraitImpact(dayActions))
        .filter((value) => value > 0)
        .reduce((sum, value) => sum + value, 0) / 5
    ),
    15
  );

  return Math.min(
    weightedScore + negativeAvoidedBonus + streakBonus + traitGrowthBonus,
    100
  );
}

export function calculateTraits(
  allActions: Action[],
  selectedActions: Action[],
  today: string
) {
  const totalImpact = getTraitImpact(allActions);
  const dailyImpact = getTraitImpact(selectedActions);
  const monthStart = getDateDaysAgo(today, 30);
  const previousMonthStart = getDateDaysAgo(today, 60);
  const monthImpact = getTraitImpact(
    allActions.filter((action) => action.date >= monthStart)
  );
  const previousMonthImpact = getTraitImpact(
    allActions.filter(
      (action) => action.date >= previousMonthStart && action.date < monthStart
    )
  );

  return TRAITS.map<TraitProgress>((trait) => {
    const xp = Math.max(0, totalImpact[trait]);
    const levelInfo = getTraitLevel(xp);
    const monthlyXp = monthImpact[trait];
    const previousMonthXp = previousMonthImpact[trait];
    const monthlyXpChange = monthlyXp - previousMonthXp;
    const previousBaseline = Math.abs(previousMonthXp);
    const monthlyChangePercent =
      previousBaseline < MIN_MONTHLY_TREND_BASELINE
        ? null
        : clamp(
            Math.round((monthlyXpChange / previousBaseline) * 100),
            -100,
            300
          );
    const monthlyTrendLabel =
      monthlyChangePercent === null
        ? `${monthlyXp >= 0 ? "+" : ""}${monthlyXp} XP this month, New progress`
        : `${monthlyChangePercent >= 0 ? "+" : ""}${monthlyChangePercent}% this month, ${
            monthlyXpChange >= 0 ? "+" : ""
          }${monthlyXpChange} XP`;

    return {
      name: trait,
      xp,
      dailyXp: dailyImpact[trait],
      monthlyXp,
      monthlyChangePercent,
      monthlyTrendLabel,
      ...levelInfo,
    };
  });
}

export function getSelectedTraitRows(actions: Action[]) {
  const impact = getTraitImpact(actions);

  return TRAITS.map((trait) => ({
    trait,
    xp: impact[trait],
  })).filter((row) => row.xp !== 0);
}

export function getInsights(
  actions: Action[],
  traits: TraitProgress[],
  today: string
) {
  const insights: string[] = [];
  const strongestTrait = [...traits].sort(
    (a, b) => b.level - a.level || b.xp - a.xp
  )[0];
  const decliningTrait = traits.find(
    (trait) =>
      trait.monthlyChangePercent !== null && trait.monthlyChangePercent < -10
  );
  const weekdayNegatives = actions.filter((action) => {
    const day = new Date(`${action.date}T00:00:00`).getDay();
    return day >= 1 && day <= 5 && getActionRule(action.label).weight < 0;
  }).length;
  const weekendNegatives = actions.filter((action) => {
    const day = new Date(`${action.date}T00:00:00`).getDay();
    return (day === 0 || day === 6) && getActionRule(action.label).weight < 0;
  }).length;
  const streak = getConsistencyStreak(actions, today);

  if (strongestTrait) insights.push(`${strongestTrait.name} is your strongest trait.`);
  if (decliningTrait) insights.push(`${decliningTrait.name} is declining this month.`);
  if (weekdayNegatives > weekendNegatives + 1) {
    insights.push("You tend to lose patience more on weekdays.");
  } else if (weekendNegatives > weekdayNegatives + 1) {
    insights.push("Your discipline drops more on weekends.");
  }
  if (
    traits.find(
      (trait) =>
        trait.name === "Empathy" &&
        trait.monthlyChangePercent !== null &&
        trait.monthlyChangePercent > 10
    )
  ) {
    insights.push("You are consistently improving empathy.");
  }
  if (streak >= 2) insights.push(`You have a ${streak}-day clean positive streak.`);

  return insights.slice(0, 3);
}

export function getActionTotals(actions: Action[]) {
  return actions.reduce(
    (totals, action) => {
      const weight = getActionRule(action.label).weight;

      if (weight > 0) totals.positive += 1;
      if (weight < 0) totals.negative += 1;

      return totals;
    },
    { positive: 0, negative: 0 }
  );
}
