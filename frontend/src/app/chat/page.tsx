'use client'

import { useRef, useState } from 'react'
import { sendChat, type ChatHistoryItem } from '@/lib/api'

type Bubble = { role: 'user' | 'assistant'; content: string }

export default function ChatPage() {
  const [messages, setMessages] = useState<Bubble[]>([
    {
      role: 'assistant',
      content: 'Assalam o Alaikum! Main ScamShield AI hoon. Scam, OTP, ya link ke bare mein poochho.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userBubble: Bubble = { role: 'user', content: text }
    setMessages((m) => [...m, userBubble])
    setLoading(true)
    try {
      const history: ChatHistoryItem[] = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }))
      const { reply } = await sendChat(text, history)
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: (e as Error).message || 'Try again in a moment.' },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-lg flex-col px-3 py-4">
      <h1 className="mb-3 text-center text-lg font-semibold text-white">Security Chat</h1>
      <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-[#0b141a] p-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-br-md bg-[#005c4b] text-[#e9edef]'
                  : 'rounded-bl-md bg-[#202c33] text-[#e9edef]'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading ? (
          <p className="text-center text-xs text-slate-500">typing…</p>
        ) : null}
        <div ref={endRef} />
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message…"
          className="flex-1 rounded-full border border-white/10 bg-[#202c33] px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400/50"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-[#005c4b] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </main>
  )
}
