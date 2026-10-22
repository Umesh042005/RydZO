import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiMessageCircle, FiSend, FiX } from 'react-icons/fi';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useAIEnabled, aiErrorMessage, AI_TIMEOUT_MS } from '../../services/ai';

const GREETING = {
  role: 'assistant',
  content: "Hi! I'm the RydZo assistant. Tell me what you need — e.g. \"a scooter under ₹500/day in Koramangala\" — or ask how booking works."
};
const SUGGESTIONS = ['Cheapest scooter for a day', 'How does the security deposit work?', 'What documents do I need?'];

// Floating chat for customers and visitors: finds bikes and answers how-to questions.
const RideAssistant = () => {
  const aiEnabled = useAIEnabled();
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, open]);

  const hidden =
    !aiEnabled ||
    user?.role === 'admin' ||
    user?.role === 'owner' ||
    location.pathname.startsWith('/admin');
  if (hidden) return null;

  const send = async (text) => {
    const content = text.trim();
    if (!content || sending) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const { data } = await api.post(
        '/api/ai/chat',
        { messages: next.filter((m) => m !== GREETING).map(({ role, content: c }) => ({ role, content: c })) },
        { timeout: AI_TIMEOUT_MS }
      );
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply, bikes: data.bikes }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: aiErrorMessage(error, 'Sorry, something went wrong. Please try again.'), error: true }
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg"
        aria-label="Open RydZo assistant"
      >
        <FiMessageCircle className="text-xl" />
        <span className="hidden sm:inline font-semibold">Ask RydZo AI</span>
      </button>
    );
  }

  return (
    <div className="fixed z-40 inset-x-2 bottom-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-96 h-[70vh] sm:h-[560px] flex flex-col bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-primary-600 text-white">
        <div>
          <p className="font-semibold">RydZo Assistant</p>
          <p className="text-xs opacity-80">AI answers can be wrong — check the bike page before booking.</p>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close assistant" className="p-1 rounded hover:bg-white/20">
          <FiX className="text-xl" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-neutral-50">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className="max-w-[85%] space-y-2">
              <div
                className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : m.error
                    ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-sm'
                    : 'bg-white text-neutral-800 border border-neutral-200 rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
              {m.bikes?.map((bike) => (
                <Link
                  key={bike._id}
                  to={`/bikes/${bike._id}`}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 p-2 bg-white border border-neutral-200 rounded-xl hover:border-primary-400"
                >
                  {bike.image ? (
                    <img src={bike.image} alt="" className="w-14 h-14 object-cover rounded-lg" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-neutral-100" />
                  )}
                  <div className="min-w-0 text-xs">
                    <p className="font-semibold text-sm text-neutral-900 truncate">
                      {(bike.model || '').toLowerCase().startsWith((bike.brand || '').toLowerCase())
                        ? bike.model
                        : `${bike.brand} ${bike.model}`}
                    </p>
                    <p className="text-neutral-700">₹{bike.pricing?.hourly}/hr · ₹{bike.pricing?.daily}/day</p>
                    {bike.address && <p className="text-neutral-500 truncate">{bike.address}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-primary-300 text-primary-800 bg-white hover:bg-primary-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {sending && <div className="text-xs text-neutral-500 px-1">Thinking…</div>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 p-3 border-t border-neutral-200"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          placeholder="Ask about bikes, prices, booking…"
          className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="p-2.5 rounded-full bg-primary-600 text-white disabled:opacity-40"
          aria-label="Send"
        >
          <FiSend />
        </button>
      </form>
    </div>
  );
};

export default RideAssistant;
