'use client';

import { useState } from 'react';

export default function TextAuthoring() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  async function send() {
    const userMsg = { role: "user", content: input };
    setMessages(m => [...m, userMsg]);

    const res = await fetch("/api/text-authoring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([...messages, userMsg]),
    });

    const data = await res.json();
    setMessages(m => [...m, data.reply]);
    setInput("");
  }

  return (
    <main className="p-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        Engaging Life – Goal Refinement
      </h1>

      <div className="space-y-4 bg-gray-100 p-6 rounded-xl">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "assistant" ? "text-blue-700" : ""}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-4">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 border p-3 rounded-xl"
        />
        <button onClick={send} className="px-6 py-3 bg-blue-600 text-white rounded-xl">
          Send
        </button>
      </div>
    </main>
  );
}
