"use client";

import { useBooks } from "@/hooks/useBooks";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  getBooksFinishedPerMonth,
  getMoodBreakdown,
  getGenreBreakdown,
  getReadingStreak,
  getYearlyProgress,
  getReadingActivityByDay,
} from "@/lib/stats";
import { ReadingHeatmap } from "@/components/ReadingHeatmap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { BookOpen, Flame, Trophy, Target } from "lucide-react";

const MOOD_COLORS = [
  "var(--primary)",
  "var(--muted-foreground)",
  "var(--destructive)",
];

export default function StatsPage() {
  const { books, loading: booksLoading } = useBooks();
  const { profile, loading: profileLoading } = useProfile();
  const router = useRouter();

  if (booksLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  const finished = books.filter((b) => b.status === "finished");
  const monthlyData = getBooksFinishedPerMonth(books);
  const moodData = getMoodBreakdown(books);
  const genreData = getGenreBreakdown(books).filter((g) => g.genre !== "Unknown");
  const streak = getReadingStreak(books);
  const activityByDay = getReadingActivityByDay(books);
  const yearlyProgress = getYearlyProgress(
    books,
    profile?.reading_goal_per_year ?? 12
  );
  const goalPercent = Math.min(
    100,
    Math.round((yearlyProgress.finished / yearlyProgress.goal) * 100)
  );

  const currentYear = new Date().getFullYear();
  const finishedThisYear = books.filter((b) => {
    if (b.status !== "finished" || !b.date_finished) return false;
    return new Date(b.date_finished).getFullYear() === currentYear;
  }).length;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl font-bold">
        Reading Stats
      </h1>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10">
              <BookOpen className="h-6 w-6 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{finished.length}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Books finished
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10">
              <Target className="h-6 w-6 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{finishedThisYear}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                This year
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10">
              <Flame className="h-6 w-6 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{streak.current}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Month streak
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10">
              <Trophy className="h-6 w-6 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{streak.longest}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Longest streak
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reading Goal Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-serif)] text-xl">
            {currentYear} Reading Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile?.reading_goal_per_year ? (
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">
                  {yearlyProgress.finished} of {yearlyProgress.goal} books
                </span>
                <span className="text-sm font-medium">{goalPercent}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--secondary)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${goalPercent}%`,
                    backgroundColor: "var(--primary)",
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                No reading goal set yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => router.push("/settings/profile")}
              >
                Set a goal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reading activity heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-serif)] text-xl">
            Reading Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReadingHeatmap data={activityByDay} />
        </CardContent>
      </Card>

      {/* Books per month chart */}
      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-serif)] text-xl">
            Books Finished Per Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          {finished.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <XAxis
                  dataKey="month"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--foreground)",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              Finish some books to see your reading trends!
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Mood breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-serif)] text-xl">
              Mood Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {moodData.some((m) => m.count > 0) ? (
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={moodData.filter((m) => m.count > 0)}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {moodData
                        .filter((m) => m.count > 0)
                        .map((_, i) => (
                          <Cell key={i} fill={MOOD_COLORS[i % MOOD_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        color: "var(--foreground)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 text-sm">
                  {moodData
                    .filter((m) => m.count > 0)
                    .map((m, i) => (
                      <div key={m.mood} className="flex items-center gap-1.5">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: MOOD_COLORS[i % MOOD_COLORS.length],
                          }}
                        />
                        <span className="text-[var(--muted-foreground)]">
                          {m.label} ({m.count})
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                Rate your finished books to see your mood breakdown.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Genre breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-serif)] text-xl">
              Top Genres
            </CardTitle>
          </CardHeader>
          <CardContent>
            {genreData.length > 0 ? (
              <div className="space-y-3">
                {genreData.map((g) => (
                  <div key={g.genre} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{g.genre}</span>
                      <span className="text-[var(--muted-foreground)]">
                        {g.count}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--secondary)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(g.count / genreData[0].count) * 100}%`,
                          backgroundColor: "var(--primary)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                Finish some books to see your genre preferences.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
