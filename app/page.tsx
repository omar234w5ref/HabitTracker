"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type Action = {
  id: number;
  date: string;
  label: string;
  amount: number;
  user_id: string;
};

export default function Home() {
  const today = new Date().toISOString().split("T")[0];

  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedProgress, setSelectedProgress] = useState(0);
  const [selectedActions, setSelectedActions] = useState<Action[]>([]);
  const [progressEffect, setProgressEffect] = useState<"gain" | "loss" | null>(
    null
  );

  const calendarRef = useRef<any>(null);

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error("Google login error:", error);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
    }
  }

  async function loadTodayProgress(currentUser: User) {
    const { data, error } = await supabase
      .from("daily_progress")
      .select("value")
      .eq("date", today)
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error("Load today error:", error);
      return;
    }

    setProgress(data?.value ?? 0);
  }

  async function loadSelectedDay(date: string, currentUser: User) {
    const { data: progressData, error: progressError } = await supabase
      .from("daily_progress")
      .select("value")
      .eq("date", date)
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (progressError) {
      console.error("Load selected progress error:", progressError);
      return;
    }

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
    setSelectedProgress(progressData?.value ?? 0);
    setSelectedActions(actionsData ?? []);
  }

  async function addAction(label: string, amount: number) {
    if (!user) return;

    const newValue = Math.max(0, Math.min(progress + amount, 100));

    setProgressEffect(amount > 0 ? "gain" : "loss");
    setProgress(newValue);

    setTimeout(() => {
      setProgressEffect(null);
    }, 600);

    const { data: existingProgress, error: checkError } = await supabase
  .from("daily_progress")
      .select("date, user_id")
      .eq("date", today)
  .eq("user_id", user.id)
  .maybeSingle();

if (checkError) {
  console.error("Check progress error:", JSON.stringify(checkError, null, 2));
  return;
}

let progressError;

if (existingProgress) {
  const { error } = await supabase
    .from("daily_progress")
    .update({
      value: newValue,
    })
    .eq("date", today)
.eq("user_id", user.id);

  progressError = error;
} else {
  const { error } = await supabase.from("daily_progress").insert({
    date: today,
    value: newValue,
    user_id: user.id,
  });

  progressError = error;
}

if (progressError) {
  console.error("Save progress error:", JSON.stringify(progressError, null, 2));
  return;
}
    const { error: actionError } = await supabase.from("daily_actions").insert({
      date: today,
      label,
      amount,
      user_id: user.id,
    });

    if (actionError) {
      console.error("Save action error:", actionError);
      return;
    }

    await loadTodayProgress(user);

    if (selectedDate === today) {
      await loadSelectedDay(today, user);
    }
  }

  async function undoLastAction() {
  if (!user) return;

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

  const { data: remainingActions, error: recalcError } = await supabase
    .from("daily_actions")
    .select("amount")
    .eq("date", today)
    .eq("user_id", user.id);

  if (recalcError) {
    console.error("Recalculate error:", recalcError);
    return;
  }

  const newProgress = Math.max(
    0,
    Math.min(
      (remainingActions ?? []).reduce((sum, action) => sum + action.amount, 0),
      100
    )
  );

  const { data: existingProgress, error: checkProgressError } = await supabase
    .from("daily_progress")
    .select("date, user_id")
    .eq("date", today)
    .eq("user_id", user.id)
    .maybeSingle();

  if (checkProgressError) {
    console.error("Check progress error:", JSON.stringify(checkProgressError, null, 2));
    return;
  }

  let updateProgressError;

  if (existingProgress) {
    const { error } = await supabase
      .from("daily_progress")
      .update({ value: newProgress })
      .eq("date", today)
      .eq("user_id", user.id);

    updateProgressError = error;
  } else {
    const { error } = await supabase.from("daily_progress").insert({
      date: today,
      value: newProgress,
      user_id: user.id,
    });

    updateProgressError = error;
  }

  if (updateProgressError) {
    console.error("Update progress error:", JSON.stringify(updateProgressError, null, 2));
    return;
  }

  setProgressEffect(lastAction.amount > 0 ? "loss" : "gain");
  setProgress(newProgress);

  setTimeout(() => {
    setProgressEffect(null);
  }, 600);

  await loadTodayProgress(user);

  if (selectedDate === today) {
    await loadSelectedDay(today, user);
  }
}
  function groupActions(actions: Action[]) {
    return actions.reduce<Record<string, Action[]>>((groups, action) => {
      if (!groups[action.label]) {
        groups[action.label] = [];
      }

      groups[action.label].push(action);
      return groups;
    }, {});
  }

  const goodActions = selectedActions.filter((action) => action.amount > 0);
  const badActions = selectedActions.filter((action) => action.amount < 0);

  const groupedGoodActions = groupActions(goodActions);
  const groupedBadActions = groupActions(badActions);

  useEffect(() => {
    import("cally");

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

    loadTodayProgress(user);
    loadSelectedDay(today, user);

    const calendar = calendarRef.current;
    if (!calendar) return;

    const handleChange = () => {
      const date = calendar.value;

      if (!date) return;

      loadSelectedDay(date, user);
    };

    calendar.addEventListener("change", handleChange);

    return () => {
      calendar.removeEventListener("change", handleChange);
    };
  }, [user]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card bg-base-100 shadow-xl w-full max-w-sm">
          <div className="card-body items-center text-center">
            <h1 className="card-title">Personality Tracker</h1>

            <button className="btn btn-primary w-full" onClick={signInWithGoogle}>
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen gap-6 p-6">
      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body items-center text-center">
          <div className="w-full flex justify-between items-center">
            <button
              className="btn btn-ghost btn-sm btn-circle text-lg"
              onClick={undoLastAction}
              title="Undo last action"
            >
              ↩
            </button>

            <button className="btn btn-ghost btn-sm" onClick={signOut}>
              Logout
            </button>
          </div>

          <h1 className="card-title">Today</h1>

          <div className="w-56 h-4 bg-base-300 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                progressEffect === "loss"
                  ? "bg-error"
                  : progressEffect === "gain"
                  ? "bg-success"
                  : "bg-primary"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <p>{progress}%</p>
          <p className="text-sm text-gray-500">Your daily personality score</p>

          <div className="flex gap-4 flex-wrap justify-center">
            <button
              className="btn btn-success"
              onClick={() => addAction("Helped someone", 20)}
            >
              Help someone
            </button>

            <button
              className="btn btn-primary"
              onClick={() => addAction("Complimented someone", 10)}
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
        </div>
      </div>

      <calendar-date
        ref={calendarRef}
        className="cally bg-base-100 border border-base-300 shadow-lg rounded-box"
      >
        <svg
          aria-label="Previous"
          className="fill-current size-4"
          slot="previous"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>

        <svg
          aria-label="Next"
          className="fill-current size-4"
          slot="next"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>

        <calendar-month></calendar-month>
      </calendar-date>

      <div className="card bg-base-100 shadow-xl w-full max-w-2xl">
        <div className="card-body">
          <h2 className="card-title">Selected day</h2>

          <p className="text-sm text-gray-500">{selectedDate}</p>

          <progress
            className="progress progress-secondary w-full"
            value={selectedProgress}
            max={100}
          />

          <p>{selectedProgress}%</p>

          <div className="divider">Actions</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <div>
              <h3 className="font-bold text-success mb-2">Good actions</h3>

              {goodActions.length === 0 ? (
                <p className="text-sm text-gray-500">No good actions saved.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(groupedGoodActions).map(([label, actions]) => (
                    <details
                      key={label}
                      className="collapse collapse-arrow bg-base-200"
                    >
                      <summary className="collapse-title font-medium">
                        {label} × {actions.length}
                      </summary>

                      <div className="collapse-content space-y-2">
                        {actions.map((action) => (
                          <div
                            key={action.id}
                            className="flex justify-between items-center"
                          >
                            <span className="text-sm">{action.label}</span>
                            <span className="text-success font-bold">
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
              <h3 className="font-bold text-error mb-2">Bad actions</h3>

              {badActions.length === 0 ? (
                <p className="text-sm text-gray-500">No bad actions saved.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(groupedBadActions).map(([label, actions]) => (
                    <details
                      key={label}
                      className="collapse collapse-arrow bg-base-200"
                    >
                      <summary className="collapse-title font-medium">
                        {label} × {actions.length}
                      </summary>

                      <div className="collapse-content space-y-2">
                        {actions.map((action) => (
                          <div
                            key={action.id}
                            className="flex justify-between items-center"
                          >
                            <span className="text-sm">{action.label}</span>
                            <span className="text-error font-bold">
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
        </div>
      </div>
    </div>
  );
}