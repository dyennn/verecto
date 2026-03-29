"use client";

import type { DiscussionGuide as DiscussionGuideType } from "@/lib/openrouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Users, Heart, Zap } from "lucide-react";

interface DiscussionGuideProps {
  discussion: DiscussionGuideType;
}

export function DiscussionGuide({ discussion }: DiscussionGuideProps) {
  return (
    <div className="space-y-6">
      {/* Hook */}
      <div className="rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-6">
        <p className="font-[family-name:var(--font-serif)] text-xl font-semibold italic leading-relaxed">
          &ldquo;{discussion.hook}&rdquo;
        </p>
      </div>

      {/* Themes */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 font-[family-name:var(--font-serif)] text-xl font-semibold">
          <Sparkles className="h-5 w-5 text-[var(--primary)]" />
          Themes to Explore
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {discussion.themes.map((theme, i) => (
            <Card key={i} className="border-[var(--border)]">
              <CardHeader className="pb-2">
                <CardTitle className="font-[family-name:var(--font-serif)] text-lg">
                  {theme.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {theme.insight}
                </p>
                <p className="text-sm font-medium italic text-[var(--primary)]">
                  {theme.question}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Character Spotlight */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-[family-name:var(--font-serif)] text-xl">
            <Users className="h-5 w-5 text-[var(--primary)]" />
            Character Spotlight: {discussion.character_spotlight.character}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
            {discussion.character_spotlight.analysis}
          </p>
          <p className="text-sm font-medium italic text-[var(--primary)]">
            {discussion.character_spotlight.question}
          </p>
        </CardContent>
      </Card>

      {/* Connection to Reader */}
      <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <Heart className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
        <div>
          <h3 className="mb-1 font-[family-name:var(--font-serif)] text-lg font-semibold">
            Connection to You
          </h3>
          <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
            {discussion.connection_to_reader}
          </p>
        </div>
      </div>

      {/* Closing Provocation */}
      <div className="rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-6 text-center">
        <Zap className="mx-auto mb-2 h-5 w-5 text-[var(--primary)]" />
        <p className="font-[family-name:var(--font-serif)] text-lg font-semibold italic">
          &ldquo;{discussion.closing_provocation}&rdquo;
        </p>
      </div>
    </div>
  );
}
