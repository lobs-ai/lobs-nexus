/**
 * Explore page — AI-powered system exploration
 */

import { useState } from "react";
import GlassCard from "../components/GlassCard";

export default function Explore() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  const quickActions = [
    "What happened today?",
    "Show active tasks",
    "System health",
    "Recent completions",
    "Overdue items",
    "Agent status",
  ];

  const handleSubmit = async (q) => {
    const queryText = q || query;
    if (!queryText.trim()) return;

    setLoading(true);
    setMessages(prev => [...prev, { role: "user", text: queryText }]);
    setQuery("");

    try {
      const response = await fetch("/paw/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: queryText }),
      });

      if (!response.ok) throw new Error("Failed to get response");
      
      const data = await response.json();
      const reply = data.reply || data.message || "No response";
      
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", text: `Error: ${err.message}`, error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>
          Explore
        </h1>
        <p className="text-gray-400">Ask anything about your system</p>
      </div>

      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Ask anything..."
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !query.trim()}
            className="px-6 py-3 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "..." : "Ask"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action}
              onClick={() => handleSubmit(action)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors disabled:opacity-50"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {messages.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>
            <p className="text-gray-400">
              Ask questions about tasks, projects, agents, or system health.
            </p>
          </GlassCard>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-lg ${
                  msg.role === "user"
                    ? "bg-blue-500/10 border border-blue-500/20 text-blue-100"
                    : msg.error
                    ? "bg-red-500/10 border border-red-500/20 text-red-400"
                    : "bg-white/5 border border-white/10 text-gray-200"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{msg.text}</div>
              </div>
            </div>
          ))
        )}
        
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
                Thinking...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
