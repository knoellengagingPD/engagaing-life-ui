// src/app/interview/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const APP_NAME = "Engaging Purpose";

// Your exact question set + conversational transitions built in
const QUESTIONS: string[] = [
  // FAMILY
  "Let’s start with **family**. Imagine your family life a few years from now if it became stronger and more joyful. What does that look like?",
  "Thanks — and staying with family for a moment: what kind of spouse, parent, sibling, or son/daughter do you hope to become?",
  "Got it. What moments, habits, or traditions would help your family thrive?",

  // FRIENDS & COMMUNITY
  "Now let’s shift to **friends and community**. Picture your social life at its best. What friendships or community connections do you want to deepen or develop?",
  "As you think about those connections: what qualities do you hope your friends value in you?",
  "And looking outward a bit: how would you like to contribute to your community or the people around you?",

  // MEANINGFUL WORK
  "Alright — let’s talk about **meaningful work**. Describe what meaningful work looks like for you—work that uses your strengths and energizes you.",
  "If your career grew in the direction you hope for, what would your daily work life be like?",
  "What skills or achievements would make you proud in your work life?",

  // FAITH / TRANSCENDENCE
  "Now I’d like to move into **faith / transcendence** in whatever way fits you. How would you like your relationship with God or your spiritual life to grow in the coming years?",
  "What experiences or practices would help you feel more grounded and connected to something greater than yourself?",
  "If your spiritual health was flourishing, how would that show up in your daily life?",

  // Negative future avoidance
  "Before we wrap up, let’s do a quick ‘what to avoid’ scan — not to be negative, but to protect what matters. First: if family life went in the wrong direction, what problems might emerge?",
  "And socially: what patterns—like isolation, conflict, or disconnection—would you want to avoid?",
  "For work: if your work life stalled or became stressful, what long-term consequences would worry you?",
  "And spiritually: what kind of drift or loss of grounding do you hope to prevent?",
];

type ConnState = "idle" | "connecting" | "connected" | "error";

export default function InterviewPage() {
  const [connState, setConnState] = useState<ConnState>("idle");
  const [isPaused, setIsPaused] = useState(false);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Simple transcript UI
  const [lines, setLines] = useState<{ role: "assistant" | "user"; text: string }[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  // WebRTC refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Audio output
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const progressLabel = useMemo(() => {
    const total = QUESTIONS.length;
    const current = Math.min(activeQuestionIndex + 1, total);
    return `${current} / ${total} Questions`;
  }, [activeQuestionIndex]);

  const progressPct = useMemo(() => {
    const total = QUESTIONS.length;
    return total === 0 ? 0 : Math.round(((activeQuestionIndex + 1) / total) * 100);
  }, [activeQuestionIndex]);

  function addLine(role: "assistant" | "user", text: string) {
    setLines((prev) => [...prev, { role, text }]);
  }

  async function getEphemeralClientSecret(): Promise<string> {
    const res = await fetch("/api/realtime-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Failed to create realtime session: ${res.status} ${t}`);
    }

    const data = await res.json();
    if (!data?.clientSecret) throw new Error("Missing clientSecret from /api/realtime-session");
    return data.clientSecret as string;
  }

  // Send a client event over the Realtime data channel
  function sendEvent(evt: any) {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    dc.send(JSON.stringify(evt));
  }

  // Ask the next question via the model (audio + transcript)
  function askQuestion(index: number) {
    const q = QUESTIONS[index];
    if (!q) return;

    // We add to UI immediately as “assistant” so the page feels alive.
    addLine("assistant", q);

    // Tell the model to say it out loud.
    // (This is the Realtime “response.create” pattern.)
    sendEvent({
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
        instructions: q,
      },
    });
  }

  const showFatal = (msg: string) => {
    setConnState("error");
    setLastError(msg);
  };

  async function start() {
    setLastError(null);
    setConnState("connecting");
    setIsPaused(false);
    setLines([]);
    setActiveQuestionIndex(0);

    try {
      // 1) Create ephemeral client secret (server-side call to OpenAI)
      const clientSecret = await getEphemeralClientSecret();

      // 2) Create peer connection + data channel
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        // Set high-level behavior for the session
        sendEvent({
          type: "session.update",
          session: {
            type: "realtime",
            instructions:
              `You are ${APP_NAME}, a warm, concise voice interviewer. ` +
              `Ask one question at a time. After the user answers, briefly acknowledge, then move to the next question. ` +
              `If the user says “I don’t know” or gives a very short answer, ask one gentle follow-up for detail. ` +
              `Do NOT ask for school ID numbers or workplace/job satisfaction items. Stay strictly on Engaging Purpose questions. ` +
              `Keep it conversational.`,
            audio: { output: { voice: "marin" } },
          },
        });

        // Kick off Q1
        askQuestion(0);
        setConnState("connected");
      };

      dc.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);

          // Helpful for debugging:
          // console.log("Realtime event:", msg);

          // Capture transcripts (these event names changed in GA; docs mention the new naming). :contentReference[oaicite:3]{index=3}
          if (msg?.type === "response.output_text.delta" && msg?.delta) {
            // Optional: if you want streaming text in UI later
          }

          if (msg?.type === "response.output_audio_transcript.delta" && msg?.delta) {
            // This is the model’s spoken transcript
            // Append as we receive it
            setLines((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                // merge into last assistant line
                const merged = { ...last, text: (last.text ?? "") + msg.delta };
                return [...prev.slice(0, -1), merged];
              }
              return [...prev, { role: "assistant", text: msg.delta }];
            });
          }

          // If you want to detect end of model turn, you can watch "response.completed" or similar
          // depending on model. Leaving lightweight for now.
        } catch {
          // ignore non-JSON
        }
      };

      pc.ontrack = (event) => {
        // Remote audio from the model
        const [stream] = event.streams;
        if (audioRef.current) {
          audioRef.current.srcObject = stream;
          audioRef.current.play().catch(() => {});
        }
      };

      // 3) Get mic audio and attach to peer connection
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = mic;
      mic.getTracks().forEach((track) => pc.addTrack(track, mic));

      // 4) Create SDP offer, then POST it to OpenAI Realtime calls endpoint
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Docs show the GA WebRTC SDP exchange is POST /v1/realtime/calls with Content-Type: application/sdp :contentReference[oaicite:4]{index=4}
      const sdpResp = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp ?? "",
      });

      if (!sdpResp.ok) {
        const t = await sdpResp.text();
        throw new Error(`Realtime SDP exchange failed: ${sdpResp.status} ${t}`);
      }

      const answerSdp = await sdpResp.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err: any) {
      setConnState("error");
      setLastError(String(err?.message ?? err));
    }
  }

  function stop() {
    setConnState("idle");
    setIsPaused(false);

    try {
      dcRef.current?.close();
    } catch {}
    dcRef.current = null;

    try {
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;

    try {
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    micStreamRef.current = null;

    setLines([]);
    setActiveQuestionIndex(0);
    setLastError(null);
  }

  function togglePause() {
    const mic = micStreamRef.current;
    if (!mic) return;

    const next = !isPaused;
    setIsPaused(next);

    mic.getAudioTracks().forEach((t) => {
      t.enabled = !next; // disable mic when paused
    });

    addLine("assistant", next ? "Pausing — take your time." : "Okay — I’m listening again.");
  }

  // For now, “Next” is manual (so you can verify it’s behaving).
  // After you’re happy, we can auto-advance when user finishes speaking.
  function nextQuestion() {
    const nextIdx = Math.min(activeQuestionIndex + 1, QUESTIONS.length - 1);
    setActiveQuestionIndex(nextIdx);
    askQuestion(nextIdx);
  }

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isActive = connState === "connecting" || connState === "connected";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-700 to-blue-500 p-6 flex items-center justify-center">
      <audio ref={audioRef} autoPlay />

      <div className="w-full max-w-5xl">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-10">
          <h1 className="text-4xl font-extrabold text-center text-blue-700">
            Welcome to {APP_NAME}
          </h1>

          <p className="text-center text-gray-600 mt-4 max-w-3xl mx-auto">
            When you start, {APP_NAME} will guide you through a purpose interview across
            family, friends & community, meaningful work, and faith/transcendence — plus a quick
            “what to avoid” scan. Your responses can be kept private and used to summarize themes and goals.
          </p>

          {/* Orb */}
          <div className="flex justify-center mt-10 mb-8">
            <div
              className={[
                "w-56 h-56 rounded-full",
                "bg-gradient-to-br from-blue-200 via-blue-400 to-blue-700",
                "shadow-[0_0_60px_rgba(59,130,246,0.55)]",
                isActive && !isPaused ? "animate-pulse" : "",
                isPaused ? "opacity-60" : "",
              ].join(" ")}
            />
          </div>

          {/* Progress */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-blue-700">Progress</div>
            <div className="text-sm font-semibold text-blue-700">{progressLabel}</div>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-700 transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <button
              onClick={start}
              disabled={isActive}
              className="px-8 py-4 rounded-full bg-blue-700 text-white font-semibold shadow hover:opacity-90 disabled:opacity-50"
            >
              {connState === "connecting" ? "Connecting..." : "Start"}
            </button>

            <button
              onClick={togglePause}
              disabled={connState !== "connected"}
              className="px-8 py-4 rounded-full border-2 border-orange-400 text-orange-600 font-semibold shadow hover:bg-orange-50 disabled:opacity-50"
            >
              {isPaused ? "Resume" : "Pause"}
            </button>

            <button
              onClick={stop}
              disabled={!isActive}
              className="px-8 py-4 rounded-full border-2 border-red-400 text-red-600 font-semibold shadow hover:bg-red-50 disabled:opacity-50"
            >
              Stop
            </button>

            <button
              onClick={nextQuestion}
              disabled={connState !== "connected" || activeQuestionIndex >= QUESTIONS.length - 1}
              className="px-8 py-4 rounded-full bg-gray-900 text-white font-semibold shadow hover:opacity-90 disabled:opacity-50"
            >
              Next Question
            </button>
          </div>

          {/* Errors */}
          {lastError && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 whitespace-pre-wrap">
              {lastError}
            </div>
          )}
        </div>

        {/* Transcript Panel */}
        <div className="bg-white/90 rounded-3xl shadow-2xl mt-6 p-6">
          <div className="text-blue-800 font-bold mb-3">Interview Transcript</div>

          <div className="max-h-64 overflow-auto space-y-3">
            {lines.length === 0 ? (
              <div className="text-gray-500">Press Start to begin.</div>
            ) : (
              lines.map((l, i) => (
                <div key={i} className={l.role === "assistant" ? "text-blue-900" : "text-gray-800"}>
                  <span className="font-semibold">
                    {l.role === "assistant" ? APP_NAME : "You"}:
                  </span>{" "}
                  <span>{l.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
