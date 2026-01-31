import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ChatMessage } from '@/lib/types'
import { PaperPlaneRight, Robot, User } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatInterfaceProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isLoading?: boolean
}

export function ChatInterface({ messages, onSendMessage, isLoading }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Card className="flex flex-col h-full glass-panel border border-white/10">
      <div className="p-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-black/40">
            <Robot size={24} weight="duotone" className="text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">AI Design Assistant</h3>
            <p className="text-xs text-muted-foreground">Powered by AI</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className={message.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                    {message.role === 'assistant' ? <Robot size={16} weight="duotone" /> : <User size={16} weight="duotone" />}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary/90 text-primary-foreground shadow-lg shadow-black/30'
                      : 'bg-white/10 text-foreground'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Robot size={16} weight="duotone" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-white/10 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                    className="w-2 h-2 rounded-full bg-foreground"
                  />
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 rounded-full bg-foreground"
                  />
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                    className="w-2 h-2 rounded-full bg-foreground"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-white/10 bg-white/5">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe your design idea..."
            disabled={isLoading}
            className="flex-1 bg-white/5 border-white/10 focus:border-primary/50"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0 rounded-full"
          >
            <PaperPlaneRight size={20} weight="fill" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
