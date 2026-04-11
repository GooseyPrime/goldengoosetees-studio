'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClientAction as AgentClientAction, StudioContextPayload } from '@/lib/ai/designAgentCore'

export type { StudioContextPayload }
export type { AgentClientAction }

type ChatMsg = { role: 'user' | 'assistant'; content: string }

type Props = {
  context: StudioContextPayload
  artUrls: Record<string, string | null>
  onAgentActions: (actions: AgentClientAction[]) => void
  messages: ChatMsg[]
  onMessagesChange: (next: ChatMsg[]) => void
  disabled?: boolean
}

const QUICK_REPLIES = [
  'What should I do next?',
  'Explain the print specs for my current area',
  'Take me to mockups',
]

export default function StudioChatPanel({
  context,
  artUrls,
  onAgentActions,
  messages,
  onMessagesChange,
  disabled,
}: Props) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const seeded = useRef(false)

  useEffect(() => {
    if (seeded.current || messages.length > 0) return
    seeded.current = true
    onMessagesChange([
      {
        role: 'assistant',
        content:
          'Hi — I am here to walk you through your order like a print shop pro: product and options first, then art that meets Printful specs, then mockups and checkout. What are you making today?',
      },
    ])
  }, [messages.length, onMessagesChange])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim()
      if (!text || sending || disabled) return
      setInput('')
      const nextMsgs = [...messages, { role: 'user' as const, content: text }]
      onMessagesChange(nextMsgs)
      setSending(true)
      try {
        const history = nextMsgs.slice(0, -1).map((x) => ({ role: x.role, content: x.content }))
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            context,
            artUrls,
            history,
          }),
        })
        const json = await res.json()
        if (!json.success) {
          onMessagesChange([
            ...nextMsgs,
            { role: 'assistant', content: json.error || 'Something went wrong. Try again.' },
          ])
          return
        }
        if (Array.isArray(json.actions) && json.actions.length > 0) {
          onAgentActions(json.actions as AgentClientAction[])
        }
        onMessagesChange([...nextMsgs, { role: 'assistant', content: json.reply || 'Done.' }])
      } catch {
        onMessagesChange([...nextMsgs, { role: 'assistant', content: 'Network error. Please retry.' }])
      } finally {
        setSending(false)
      }
    },
    [input, sending, disabled, context, artUrls, messages, onMessagesChange, onAgentActions]
  )

  return (
    <aside
      className="flex flex-col border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900/95 backdrop-blur-sm lg:w-[380px] lg:min-w-[320px] lg:max-h-[calc(100vh-5rem)] lg:sticky lg:top-[4.5rem] self-stretch shadow-xl"
      aria-label="Design assistant chat"
    >
      <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-950/80">
        <h2 className="text-sm font-semibold text-zinc-100 font-serif">Studio assistant</h2>
        <p className="text-xs text-zinc-500">Product help, specs, and step-by-step guidance.</p>
      </div>
      <div className="flex flex-wrap gap-1.5 px-3 pt-2">
        {QUICK_REPLIES.map((q) => (
          <button
            key={q}
            type="button"
            disabled={sending || disabled}
            onClick={() => void send(q)}
            className="text-[11px] rounded-full border border-zinc-700 px-2 py-1 text-zinc-400 hover:text-amber-400/90 hover:border-amber-600/40 disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[200px] max-h-[40vh] lg:max-h-none lg:flex-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm rounded-lg px-3 py-2 ${
              msg.role === 'user'
                ? 'bg-amber-500/15 text-zinc-100 border border-amber-500/25 ml-4'
                : 'bg-zinc-800/80 text-zinc-200 mr-2 border border-zinc-700/80'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wide opacity-60 block mb-0.5">
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </span>
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-zinc-800 bg-zinc-950/60">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            rows={2}
            disabled={sending || disabled}
            placeholder={disabled ? 'Chat unavailable…' : 'Ask anything…'}
            className="flex-1 text-sm border border-zinc-700 rounded-lg px-2 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || disabled || !input.trim()}
            className="self-end px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-sm font-semibold disabled:opacity-40 h-fit hover:bg-amber-400"
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </aside>
  )
}
