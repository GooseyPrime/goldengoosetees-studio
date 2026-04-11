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
  disabled?: boolean
}

export default function StudioChatPanel({ context, artUrls, onAgentActions, disabled }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      content:
        'Hi! I can help you pick products, switch print areas, generate or edit designs, and guide you to mockups and checkout. What would you like to do?',
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || sending || disabled) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: text }])
    setSending(true)
    try {
      const history = messages.map((x) => ({ role: x.role, content: x.content }))
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
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: json.error || 'Something went wrong. Try again.' },
        ])
        return
      }
      if (Array.isArray(json.actions) && json.actions.length > 0) {
        onAgentActions(json.actions as AgentClientAction[])
      }
      setMessages((m) => [...m, { role: 'assistant', content: json.reply || 'Done.' }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Network error. Please retry.' }])
    } finally {
      setSending(false)
    }
  }, [input, sending, disabled, context, artUrls, messages, onAgentActions])

  return (
    <aside
      className="flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 bg-white/95 backdrop-blur-sm lg:w-[380px] lg:min-w-[320px] lg:max-h-[calc(100vh-5rem)] lg:sticky lg:top-[4.5rem] self-stretch shadow-sm"
      aria-label="Design assistant chat"
    >
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
        <h2 className="text-sm font-semibold text-slate-800">Design assistant</h2>
        <p className="text-xs text-slate-500">Ask for help, generate art, or jump steps.</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[200px] max-h-[40vh] lg:max-h-none lg:flex-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm rounded-lg px-3 py-2 ${
              msg.role === 'user'
                ? 'bg-slate-900 text-white ml-4'
                : 'bg-slate-100 text-slate-800 mr-2'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wide opacity-70 block mb-0.5">
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </span>
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-slate-100 bg-white">
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
            placeholder={disabled ? 'Configure OpenAI key…' : 'Ask anything…'}
            className="flex-1 text-sm border border-slate-300 rounded-lg px-2 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:bg-slate-50"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || disabled || !input.trim()}
            className="self-end px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium disabled:opacity-40 h-fit"
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </aside>
  )
}
