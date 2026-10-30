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
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[calc(100vh-140px)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-700 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5 text-blue-200" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">AI Privacy &amp; Regulatory Advisor</h2>
            <p className="text-xs text-slate-500">
              Guidance on privacy-enhancing technologies, de-identification, and compliance frameworks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Gemini 3.8 Flash</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
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
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-indigo-900 text-blue-200 shadow-xs'
                }`}
              >
                {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`p-4 rounded-xl text-xs leading-relaxed space-y-1.5 shadow-xs ${
                  isUser
                    ? 'bg-blue-700 text-white rounded-tr-none'
                    : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div
                  className={`text-[10px] text-right font-mono ${
                    isUser ? 'text-blue-200' : 'text-slate-400'
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
            <div className="w-8 h-8 rounded-full bg-indigo-900 text-blue-200 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 rounded-tl-none flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-700" />
              <span>Synthesizing privacy engineering advice...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-6 py-2 bg-slate-50/80 border-t border-slate-200 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-slate-400 shrink-0 flex items-center gap-1 font-medium">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span>Quick queries:</span>
        </span>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={isLoading}
            className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-800 border border-slate-200 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-3">
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
          className="flex-1 p-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none max-h-24"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="p-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white rounded-lg transition-colors cursor-pointer shadow-xs shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Disclaimer banner */}
      <div className="px-6 py-1.5 bg-slate-100 border-t border-slate-200 text-[10px] text-slate-500 text-center">
        The AI Privacy Advisor provides technical best practices for informational purposes. It does not provide formal legal counsel.
      </div>
    </div>
  );
};
