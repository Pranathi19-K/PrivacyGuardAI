import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  User as UserIcon,
  Bot,
  RefreshCw,
  Lightbulb,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { api } from '../../services/api.ts';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  'How do I mask credit card data while maintaining format for downstream analytics?',
  'What is the difference between pseudonymization and anonymization under GDPR Recital 26?',
  'How can I sanitize application logs before feeding them into an LLM context?',
  'What are the 18 HIPAA Safe Harbor identifiers that must be removed from medical text?',
];

export const PrivacyAssistantView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: "Hello! I am your PrivyShield AI Enterprise Privacy Advisor. I can guide your team on de-identification architectures, GDPR/HIPAA/PCI-DSS technical safeguards, prompt sanitization for generative AI, and deterministic masking strategies. How can I assist your privacy engineering today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const userText = (textToSend || input).trim();
    if (!userText || isLoading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await api.chatAssistant(userText, history);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'model',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `Error connecting to Gemini assistant: ${err.message}. Please verify the server's GEMINI_API_KEY environment variable.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#0b1930] rounded-xl border border-[#263e65] shadow-xl flex flex-col h-[calc(100dvh-140px)] min-h-[450px] overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 bg-[#101f3b] border-b border-[#263e65] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5 text-cyan-200" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">AI Privacy &amp; Regulatory Advisor</h2>
            <p className="text-xs text-slate-500">
              Guidance on privacy-enhancing technologies, de-identification, and compliance frameworks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Gemini 3.8 Flash</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-[#142b4d] text-cyan-200 shadow-xs'
                }`}
              >
                {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`p-4 rounded-xl text-xs leading-relaxed space-y-1.5 shadow-xs ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-[#142541] text-slate-200 border border-[#263e65] rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div
                  className={`text-[10px] text-right font-mono ${
                    isUser ? 'text-cyan-200' : 'text-slate-500'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 max-w-3xl mr-auto">
            <div className="w-8 h-8 rounded-full bg-[#142b4d] text-cyan-200 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-xl bg-[#142541] border border-[#263e65] text-xs text-slate-500 rounded-tl-none flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-300" />
              <span>Synthesizing privacy engineering advice...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-6 py-2 bg-[#101f3b] border-t border-[#263e65] flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-slate-500 shrink-0 flex items-center gap-1 font-medium">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick queries:</span>
        </span>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={isLoading}
            className="px-2.5 py-1 bg-[#142541] hover:bg-cyan-400/10 text-slate-300 hover:text-cyan-200 border border-[#263e65] rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 sm:p-4 bg-[#101f3b] border-t border-[#263e65] flex items-center gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask anything about data privacy, HIPAA Safe Harbor, pseudonymization, or prompt sanitization..."
          rows={1}
          className="flex-1 p-2.5 text-xs border border-[#345078] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none max-h-24"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white rounded-lg transition-colors cursor-pointer shadow-xs shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Disclaimer banner */}
      <div className="px-6 py-1.5 bg-[#0a1830] border-t border-[#263e65] text-[10px] text-slate-500 text-center">
        The AI Privacy Advisor provides technical best practices for informational purposes. It does not provide formal legal counsel.
      </div>
    </div>
  );
};
