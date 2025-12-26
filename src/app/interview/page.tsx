'use client';

import { useMemo, useState } from 'react';
import { GoalResults, type GoalAnalysis } from '@/components/GoalResults';
import { useRealtimeTranscription } from '@/lib/useRealtimeTranscription';

type Step =
  | { type: 'transition'; text: string }
  | { type: 'question'; text: string; section: string };

const FLOW: Step[] = [
  { type: 'transition', text: 'Welcome to Engaging Purpose. We’ll walk through four areas—Family, Friends & Community, Meaningful Work, and Faith or Transcendence. Share only what feels right. Let’s begin with family.' },

  // FAMILY
  { type: 'transition', text: 'First, think about your family and the kind of life you want to build together.' },
  { type: 'question', section: 'FAMILY (Positive Future)', text: 'Imagine your family life a few years from now if it became stronger and more joyful. What does that look like?' },
  { type: 'question', section: 'FAMILY (Positive Future)', text: 'What kind of spouse, parent, sibling, or son/daughter do you hope to become?' },
  { type: 'question', section: 'FAMILY (Positive Future)', text: 'What moments, habits, or traditions would help your family thrive?' },

  // FRIENDS & COMMUNITY
  { type: 'transition', text: 'Thank you. Let’s widen the lens a bit and talk about friendships and community.' },
  { type: 'transition', text: 'Think about relationships outside your family — the people and communities that give you energy and support.' },
  { type: 'question', section: 'FRIENDS & COMMUNITY (Positive Future)', text: 'Picture your social life at its best. What friendships or community connections do you want to deepen or develop?' },
  { type: 'question', section: 'FRIENDS & COMMUNITY (Positive Future)', text: 'What qualities do you hope your friends value in you?' },
  { type: 'question', section: 'FRIENDS & COMMUNITY (Positive Future)', text: 'How would you like to contribute to your community or the people around you?' },

  // WORK
  { type: 'transition', text: 'Now let’s shift toward your work and how it fits into a meaningful life.' },
  { type: 'transition', text: 'Think about work that feels aligned, energizing, and worthwhile.' },
  { type: 'question', section: 'MEANINGFUL WORK (Positive Future)', text: 'Describe what meaningful work looks like for you—work that uses your strengths and energizes you.' },
  { type: 'question', section: 'MEANINGFUL WORK (Positive Future)', text: 'If your career grew in the direction you hope for, what would your daily work life be like?' },
  { type: 'question', section: 'MEANINGFUL WORK (Positive Future)', text: 'What skills or achievements would make you proud in your work life?' },

  // FAITH
  { type: 'transition', text: 'Next we’ll look at faith or transcendence — whatever helps you feel grounded, guided, or connected to something bigger than yourself.' },
  { type: 'transition', text: 'Think about your spiritual life, values, or inner grounding.' },
  { type: 'question', section: 'FAITH / TRANSCENDENCE (Positive Future)', text: 'How would you like your relationship with God or your spiritual life to grow in the coming years?' },
  { type: 'question', section: 'FAITH / TRANSCENDENCE (Positive Future)', text: 'What experiences or practices would help you feel more grounded and connected to something greater than yourself?' },
  { type: 'question', section: 'FAITH / TRANSCENDENCE (Positive Future)', text: 'If your spiritual health was flourishing, how would that show up in your daily life?' },

  // NEGATIVE FUTURE
  { type: 'transition', text: 'You’ve described where you want to go. Now we’ll briefly look at what you want to avoid — the paths that could pull you away from that future.' },

  { type: 'transition', text: 'Starting again with family.' },
  { type: 'question', section: 'FAMILY (Negative Future Avoidance)', text: 'If family life went in the wrong direction, what problems might emerge?' },

  { type: 'transition', text: 'Now friends and community.' },
  { type: 'question', section: 'FRIENDS & COMMUNITY (Negative Future Avoidance)', text: 'What social patterns—like isolation, conflict, or disconnection—would you want to avoid?' },

  { type: 'transition', text: 'Next, work.' },
  { type: 'question', section: 'MEANINGFUL WORK (Negative Future Avoidance)', text: 'If your work life stalled or became stressful, what long-term consequences would worry you?' },

  { type: 'transition', text: 'Finally, faith or transcendence.' },
  { type: 'question', section: 'FAITH / TRANSCENDENCE (Negative Future Avoidance)', text: 'What spiritual drift or loss of grounding do you hope to prevent?' },

  { type: 'transition', text: 'That completes the reflection. Click “Stop & Analyze” and I’ll summarize themes and goals across the four areas.' },
];

function isQuestion(step: Step): step is Extract<Step, { type: 'question' }> {
  return step.type === 'question';
}

export default function InterviewPage() {
  const [isActive, setIsActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<GoalAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = FLOW[index];
  const total = FLOW.length;

  const progress = useMemo(() => {
    if (!isActive) return 0;
    return Math.min(100, Math.round(((index + 1) / total) * 100));
  }, [index, total, isActive]);

  const { status: voiceStatus, error: voiceError, partial, start: startVoice, stop: stopVoice } =
    useRealtimeTranscription({
      onFinalTranscript: (finalText) => {
        // Only treat speech as an answer when we are currently on a QUESTION
        const current = FLOW[index];
        if (!isActive) return;
        if (!current || !isQuestion(current)) return;

        setTranscript(prev => [
          ...prev,
          `SECTION: ${current.section}`,
          `Q: ${current.text}`,
          `A: ${finalText}`,
        ]);

        // Auto-advance after a spoken turn completes
        setIndex(i => Math.min(i + 1, total - 1));
      },
    });

  const isListening = voiceStatus === 'listening';

  function startInterview() {
    setIsActive(true);
    setIndex(0);
    setTranscript([]);
    setAnalysis(null);
    setError(null);

    // Start mic + realtime transcription immediately
    startVoice();
  }

  function nextManual() {
    if (!isActive) return;

    // record transitions into transcript for auditing/debugging
    const current = FLOW[index];
    if (current?.type === 'transition') {
      setTranscript(prev => [...prev, `TRANSITION: ${current.text}`]);
    }

    setIndex(i => Math.min(i + 1, total - 1));
  }

  async function stopAndAnalyze() {
    if (!isActive) return;

    setIsActive(false);

    // stop mic / webrtc
    stopVoice();

    try {
      setAnalyzing(true);
      setError(null);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          product: 'engaging-purpose',
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = (await res.json()) as GoalAnalysis;
      setAnalysis(data);
    } catch (e: any) {
      setError(e?.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 via-blue-700 to-blue-900 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center">
          <h1 className="text-4xl font-semibold text-blue-700">Engaging Purpose</h1>
          <p className="mt-4 text-slate-600 max-w-3xl mx-auto">
            Speak your answers. I’ll capture them automatically and summarize goals at the end.
          </p>

          {/* Orb (real listening indicator) */}
          <div className="mt-10 flex justify-center">
            <div
              className={[
                'w-40 h-40 rounded-full border-[14px] border-blue-600 bg-white shadow-md',
                isActive && isListening ? 'animate-pulse' : '',
              ].join(' ')}
              title={isListening ? 'Listening…' : isActive ? 'Connecting…' : 'Idle'}
            />
          </div>

          {/* Progress */}
          <div className="mt-8 text-left">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Progress</span>
              <span>{isActive ? index + 1 : 0} / {total}</span>
            </div>
            <div className="mt-2 h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-700 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {!isActive ? (
              <button
                onClick={startInterview}
                className="px-10 py-4 rounded-full bg-blue-700 text-white font-semibold shadow-lg hover:bg-blue-800"
              >
                Start Interview (Voice)
              </button>
            ) : (
              <>
                <button
                  onClick={stopAndAnalyze}
                  className="px-10 py-4 rounded-full border-2 border-red-300 text-red-600 font-semibold"
                >
                  Stop & Analyze
                </button>

                <button
                  onClick={nextManual}
                  className="px-10 py-4 rounded-full bg-blue-700 text-white font-semibold"
                >
                  Next (for transitions)
                </button>
              </>
            )}
          </div>

          {/* Prompt */}
          <div className="mt-10 bg-blue-50 border border-blue-100 rounded-2xl p-6 text-left">
            <div className="font-semibold text-blue-900">
              {isActive ? (step?.type === 'question' ? 'Question (Speak your answer)' : 'Transition') : 'Interview'}
            </div>

            <div className="mt-2 text-slate-800">
              {isActive ? step?.text : 'Click Start Interview to begin.'}
            </div>

            {/* Live partial transcript while speaking */}
            {isActive && step?.type === 'question' && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-slate-600 mb-2">Live transcript</div>
                <div className="min-h-[52px] rounded-xl border border-slate-200 bg-white p-4">
                  <span className="text-slate-800">{partial || '…'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Debug / status */}
          <div className="mt-6 text-left space-y-2">
            {isActive && (
              <div className="text-sm text-slate-600">
                Voice status: <span className="font-semibold">{voiceStatus}</span>
              </div>
            )}
            {(voiceError || error) && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
                {voiceError || error}
              </div>
            )}
            {analyzing && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-indigo-900">
                Analyzing your responses…
              </div>
            )}
          </div>

          {/* Transcript preview */}
          {transcript.length > 0 && (
            <div className="mt-8 bg-white border rounded-2xl p-6 text-left">
              <div className="font-semibold mb-2">Transcript (preview)</div>
              <div className="space-y-2">
                {transcript.slice(-10).map((line, i) => (
                  <div key={i} className="text-sm bg-slate-50 border rounded-lg p-2">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {analysis && <GoalResults analysis={analysis} />}

        <div className="text-center text-white/70 text-sm mt-10">
          Engaging Purpose · Voice Interview · Goal Engine
        </div>
      </div>
    </div>
  );
}
