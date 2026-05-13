"use client";

import { MessageCircle, Send } from "lucide-react";

const mockConversations = [
  { id: "1", name: "Aarav Mehta", preview: "Hey! Saw your card, we're in the same branch.", time: "2m ago", unread: 2, initials: "AM", gradient: "from-blue-500 to-cyan-400" },
  { id: "2", name: "Priya Sharma", preview: "Would love to connect!", time: "1h ago", unread: 0, initials: "PS", gradient: "from-pink-500 to-violet-500" },
  { id: "3", name: "Rohan Das", preview: "What section are you in?", time: "3h ago", unread: 1, initials: "RD", gradient: "from-emerald-500 to-teal-400" },
];

export default function ChatPage() {
  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Chat</h1>
        <p className="text-sm text-white/40">Your conversations.</p>
      </div>

      {mockConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <MessageCircle size={40} className="text-white/10 mb-4" />
          <p className="text-white/30 text-sm">No conversations yet.</p>
          <p className="text-white/20 text-xs mt-1">
            Like or chat with someone from the home feed.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {mockConversations.map((convo) => (
            <button
              key={convo.id}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 hover:border-white/14 transition-all text-left group"
            >
              {/* Avatar */}
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${convo.gradient} flex items-center justify-center text-sm font-semibold text-white flex-shrink-0`}
              >
                {convo.initials}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-semibold text-white">{convo.name}</span>
                  <span className="text-[10px] text-white/25">{convo.time}</span>
                </div>
                <p className="text-xs text-white/40 truncate">{convo.preview}</p>
              </div>

              {/* Unread badge */}
              {convo.unread > 0 && (
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {convo.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Coming soon note */}
      <div className="mt-8 p-4 rounded-xl border border-white/5 bg-white/2 flex items-start gap-3">
        <Send size={14} className="text-violet-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-white/50">Real-time chat coming soon</p>
          <p className="text-xs text-white/25 mt-0.5">
            WebSocket-powered messaging is being built. Conversations above are previews.
          </p>
        </div>
      </div>
    </div>
  );
}
