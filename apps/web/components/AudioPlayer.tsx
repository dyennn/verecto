"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioPlayerProps {
  script: string;
  bookTitle: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function AudioPlayer({ script, bookTitle }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [supported, setSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const estimatedDurationRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    // Prefer high-quality English voices
    const preferred = voices.find(
      (v) => v.lang.startsWith("en") && v.name.includes("Google")
    );
    const englishVoice = voices.find((v) => v.lang.startsWith("en"));
    return preferred || englishVoice || voices[0] || null;
  }, []);

  function handlePlay() {
    if (!supported) return;

    if (playing) {
      window.speechSynthesis.pause();
      setPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // If paused mid-speech, resume
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPlaying(true);
      startProgressTracker();
      return;
    }

    // Start fresh
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.rate = speed;
    const voice = pickVoice();
    if (voice) utterance.voice = voice;

    // Rough estimate: ~150 words per minute at 1x speed
    const wordCount = script.split(/\s+/).length;
    estimatedDurationRef.current = (wordCount / 150 / speed) * 60 * 1000;
    startTimeRef.current = Date.now();

    utterance.onend = () => {
      setPlaying(false);
      setProgress(100);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
    setProgress(0);
    startProgressTracker();
  }

  function startProgressTracker() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(
        99,
        (elapsed / estimatedDurationRef.current) * 100
      );
      setProgress(pct);
    }, 200);
  }

  function handleStop() {
    window.speechSynthesis.cancel();
    setPlaying(false);
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function handleSpeedChange() {
    const idx = SPEEDS.indexOf(speed);
    const nextSpeed = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(nextSpeed);

    // If currently playing, restart with new speed
    if (playing) {
      window.speechSynthesis.cancel();
      if (intervalRef.current) clearInterval(intervalRef.current);

      const utterance = new SpeechSynthesisUtterance(script);
      utterance.rate = nextSpeed;
      const voice = pickVoice();
      if (voice) utterance.voice = voice;

      const wordCount = script.split(/\s+/).length;
      estimatedDurationRef.current =
        (wordCount / 150 / nextSpeed) * 60 * 1000;
      startTimeRef.current = Date.now();

      utterance.onend = () => {
        setPlaying(false);
        setProgress(100);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setProgress(0);
      startProgressTracker();
    }
  }

  if (!supported) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-center text-sm text-[var(--muted-foreground)]">
        Audio playback is not supported in this browser.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePlay}
          className="h-10 w-10 rounded-full p-0"
        >
          {playing ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleStop}
          className="h-8 w-8 p-0"
        >
          <Square className="h-4 w-4" />
        </Button>

        {/* Progress bar */}
        <div className="flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--secondary)]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress}%`,
                backgroundColor: "var(--primary)",
              }}
            />
          </div>
        </div>

        {/* Speed */}
        <button
          onClick={handleSpeedChange}
          className="rounded px-2 py-1 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
        >
          {speed}x
        </button>
      </div>

      <p className="mt-2 text-xs text-[var(--muted-foreground)]">
        {bookTitle} — Verecto Discussion
      </p>
    </div>
  );
}
