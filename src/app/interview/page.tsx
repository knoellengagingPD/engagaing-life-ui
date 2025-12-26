'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GoalResults, type GoalAnalysis } from '@/components/GoalResults';

type InterviewState = 'idle' | 'running' | 'paused' | 'analyzing' | 'done';

const PRODUCT = 'engaging-purpose';

// Keep this at 28 so your UI matches “X / 28 Questions”
const QUESTIONS: string[] = [
  'Welcome to Engaging Purpose. Before we begin, what role best describes you right now (parent, educator, leader, student, other)?',
  'In one sentence, what would you like to be different in your life by this time next year?',
  'When you feel most “on purpose,” what are you usually doing?',
  'What’s one thing you’re doing now that is pulling you off course?',
  'What do you want more of in your family life over the next year?',
  'What do you want less of in your family life over the next year?',
  'What is one relationship you want to strengthen, and why?',
  'What’s one boundary that would protect your closest relationships?',
  'Which friendships energize you most—and what do they have in common?',
  'Which relationships drain you—and what patterns do you notice?',
  'What would “meaningful work” look like for you in the next 6–12 months?',
  'What’s one skill or capability that would make your work life better?',
  'What’s the biggest obstacle at work (time, confidence, clarity, systems, people, other)?',
  'If your work improved by 20%, what would be the first sign you’d notice?',
  'What gives you a sense of meaning or contribution beyond your job?',
  'Where do you feel stuck or discouraged right now?',
  'What is one habit you’d like to build that would change your day-to-day life?',
  'What is one habit you’d like to reduce or remove?',
  'What do you want your health and energy to feel like most days?',
  'What environment changes (home/work) would make growth easier?',
  'What’s a “dream big” change you secretly want, even if it feels hard?',
  'What would you regret not trying if you look back a year from now?',
  'What does “purpose/faith” mean to you (spiritual, values, service, integrity, calling, other)?',
  'What is one value you want to live more consistently?',
  'Who benefits most if you fully step into your purpose?',
  'What support do you need (people, schedule, accountability, tools)?',
  'What would be a realistic first step you could take in the next 7 days?',
  'Anything else you want me to know before I summarize goals across your four areas?',
];

export default function InterviewPage() {
  const [state, setState] = useState<InterviewState>('idle');
  const [qIndex, setQIndex] = useState<number>(0);
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<GoalAnalysis | null>(null);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const totalQuestions = QUESTIONS.length;

  const progressPct = useMemo(() => {
    const answered = Math.min(qIndex, totalQuestions);
    return Math.round((answered / totalQuestions) * 100);
  }, [qIndex, totalQuestions]);

  const currentPrompt = useMemo(() => {
    if (qIndex >= totalQuestions) return 'Interview complete.';
    return QUESTIONS[qIndex];
  }, [qIndex, totalQuestions]);

  // Auto-scroll transcript panel
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptLines.length, state]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, []);

  async function startRealtimeSession() {
    // Optional: keep this call so your existing /api/realtime-session remains used.
    // If it fails, we don’t hard-stop the demo UI.
    try {
      const res = await fetch('/api/realtime-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return;
      await res.json();
    } catch {
      // ignore
    }
  }

  function pushSystemLine(text: string) {
    setTranscriptLines((prev) => [...prev, `Clarity: ${text}`]);
  }

  function pushUserLine(text: string) {
    setTranscriptLines((prev) => [...prev, `You: ${text}`]);
  }

  function stopTimer() {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  function startTimer() {
    stopTimer();
    // Demo cadence: every ~9s advance to next prompt unless paused/stopped.
    intervalRef.current = window.setInterval(() => {
      setQIndex((prev) => {
        const next = prev + 1;
        if (next >= totalQuestions) {
          // When the last question has been shown, auto-finish.
          // We let state update happen outside this setState to avoid race.
          window.setTimeout(() => void finishInterview(), 50);
          return prev; // keep index stable; finishInterview will set it.
        }
        pushSystemLine(QUESTIONS[next]);
        return next;
      });
    }, 9000);
  }

  async function startInterview() {
    setError(null);
    setAnalysis(null);
    setSavedSessionId(null);
    setTranscriptLines([]);
    setQIndex(0);
    setState('running');

    // Kick off session token (optional)
    void startRealtimeSession();

    // First message + prompt
    pushSystemLine(
      'Welcome to Engaging Purpose. I’ll guide you through a short interview and then I’ll generate goals in four areas: Family, Friends, Meaningful Work, and Purpose/Faith.'
    );
    pushSystemLine(`Question 1: ${QUESTIONS[0]}`);

    // Demo: add a tiny “user” seed so you see the transcript flow
    window.setTimeout(() => pushUserLine('Ready.'), 1200);

    startTimer();
  }

  function pauseInterview() {
    if (state !== 'running') return;
    setState('paused');
    stopTimer();
    pushSystemLine('Paused. Say resume when you are ready.');
  }

  function resumeInterview() {
    if (state !== 'paused') return;
    setState('running');
    pushSystemLine('Resuming.');
    startTimer();
  }

  async function finishInterview() {
    if (state === 'analyzing' || state === 'done') return;

    stopTimer();
    setState('analyzing');
    setError(null);

    // Ensure index marks completion for progress UI
    setQIndex(totalQuestions);

    const transcriptText = transcriptLines.join('\n');

    try {
      // 1) Analyze
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: PRODUCT,
          transcript: transcriptText,
          areas: ['Family', 'Friends', 'Meaningful Work', 'Purpose/Faith'],
        }),
      });

      if (!analyzeRes.ok) {
        const msg = await analyzeRes.text().catch(() => '');
        throw new Error(msg || 'Analyze failed.');
      }

      const analyzeJson = (await analyzeRes.json()) as GoalAnalysis;
      setAnalysis(analyzeJson);

      // 2) Save to KV
      const saveRes = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: PRODUCT,
          transcript: transcriptText,
          analysis: analyzeJson,
        }),
      });

      if (!saveRes.ok) {
        const msg = await saveRes.text().catch(() => '');
        throw new Error(msg || 'Save failed.');
      }

      const saved = (await saveRes.json()) as { id: string };
      setSavedSessionId(saved.id);

      setState('done');
      pushSystemLine('Thanks — I’ve generated your Engaging Purpose goal summary.');
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.');
      setState('done');
    }
  }

  function stopInterview() {
    // Stop immediately, then analyze automatically.
    pushSystemLine('Stopping interview. One moment while I analyze your responses…');
    void finishInterview();
  }

  const isRunning = state === 'running';
  const isPaused = state === 'paused';
  const isAnalyzing = state === 'analyzing';

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        {/* Main Card */}
        <div className="bg-white/95 rounded-2xl shadow-2xl p-10 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-800 text-center">
            Welcome to the Engaging Purpose Interview Experience!
          </h1>

          <p className="mt-4 text-center text-gray-700 max-w-3xl mx-auto">
            When you start, Clarity will guide you through questions that help you clarify direction, meaning, and next steps.
            Your responses are private and used to generate goal suggestions in four areas.
          </p>

          {/* Ring */}
          <div className="mt-10 flex items-center justify-center">
            <div
              className={[
                'h-40 w-40 md:h-44 md:w-44 rounded-full',
                'border-[14px] border-blue-500/90',
                'shadow-[0_0_0_10px_rgba(59,130,246,0.12)]',
                isRunning ? 'animate-pulse' : '',
                isAnalyzing ? 'opacity-60' : '',
              ].join(' ')}
              aria-label="Listening ring"
            />
          </div>

          {/* Progress */}
          <div className="mt-10">
            <div className="flex items-center justify-between text-sm font-medium text-blue-800">
              <span>Progress</span>
              <span>
                {Math.min(qIndex + (state === 'idle' ? 0 : 1), totalQuestions)} / {totalQuestions} Questions
              </span>
            </div>
            <div className="mt-2 h-3 w-full bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-500"
                style={{ width: `${Math.min(progressPct, 100)}%` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={startInterview}
              disabled={isRunning || isPaused || isAnalyzing}
              className="w-full sm:w-auto px-10 py-3 rounded-full text-white font-semibold bg-blue-600 hover:bg-blue-700 transition disabled:opacity-40"
            >
              Start
            </button>

            {!isPaused ? (
              <button
                onClick={pauseInterview}
                disabled={!isRunning}
                className="w-full sm:w-auto px-10 py-3 rounded-full font-semibold border-2 border-orange-400 text-orange-600 hover:bg-orange-50 transition disabled:opacity-40"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={resumeInterview}
                className="w-full sm:w-auto px-10 py-3 rounded-full font-semibold border-2 border-orange-400 text-orange-600 hover:bg-orange-50 transition"
              >
                Resume
              </button>
            )}

            <button
              onClick={stopInterview}
              disabled={state === 'idle' || isAnalyzing}
              className="w-full sm:w-auto px-10 py-3 rounded-full font-semibold border-2 border-red-400 text-red-600 hover:bg-red-50 transition disabled: فهم disabled:opacity-40"
            >
              Stop
            </button>
          </div>

          {/* Current prompt (clean, like your example) */}
          {(state !== 'idle') && (
            <div className="mt-10 text-center text-blue-900">
              <p className="text-base md:text-lg">
                {isAnalyzing ? 'Analyzing…' : currentPrompt}
              </p>
            </div>
          )}

          {/* Results */}
          {analysis && (
            <div className="mt-10">
              <GoalResults analysis={analysis} />
              {savedSessionId && (
                <p className="mt-6 text-center text-sm text-gray-600">
                  Saved session id: <span className="font-mono">{savedSessionId}</span>
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="mt-10 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
              <div className="font-semibold mb-1">Error</div>
              <div className="text-sm whitespace-pre-wrap">{error}</div>
              <div className="text-xs mt-2 text-red-600">
                Tip: If this is “KV not configured”, confirm KV env vars exist in Vercel for Production + Preview.
              </div>
            </div>
          )}
        </div>

        {/* Transcript Panel */}
        <div className="mt-6 bg-white/95 rounded-2xl shadow-2xl p-6">
          <div className="text-blue-800 font-semibold mb-2">Transcript</div>

          <div className="max-h-52 overflow-auto rounded-xl bg-blue-50 border border-blue-100 p-4">
            {transcriptLines.length === 0 ? (
              <div className="text-sm text-gray-600 italic">
                Transcript will appear here as the interview runs.
              </div>
            ) : (
              <div className="space-y-2 text-sm text-gray-800">
                {transcriptLines.map((line, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {line}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
