import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot, Send, RefreshCw, ChevronDown, ChevronUp,
  Loader2, Cpu, Database, AlertCircle, CheckCircle2, Info
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Source {
  client    : string;
  geography : string | null;
  env       : string;
  reportName: string;
  filename  : string;
  score     : number;
}

interface Message {
  role   : 'user' | 'assistant' | 'system';
  content: string;
  sources?: Source[];
  isError?: boolean;
}

interface RagStatusData {
  chunksCount  : number;
  lastIndexedAt: string | null;
  hasApiKey    : boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const RagChat: React.FC = () => {
  const [status,         setStatus        ] = useState<RagStatusData>({ chunksCount: 0, lastIndexedAt: null, hasApiKey: false });
  const [messages,       setMessages      ] = useState<Message[]>([]);
  const [input,          setInput         ] = useState('');
  const [loading,        setLoading       ] = useState(false);
  const [indexing,       setIndexing      ] = useState(false);
  const [openSources,    setOpenSources   ] = useState<Set<number>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  // ── Safe JSON parse (handles empty bodies and non-JSON responses) ──────────
  const safeJson = async (r: Response): Promise<any> => {
    const text = await r.text();
    if (!text.trim()) throw new Error(`El servidor respondió con cuerpo vacío (HTTP ${r.status}). Asegúrate de que el servidor está corriendo y reinícialo si acabas de añadir las rutas RAG.`);
    try { return JSON.parse(text); }
    catch { throw new Error(`Respuesta no JSON del servidor (HTTP ${r.status}): ${text.slice(0, 120)}`); }
  };

  // ── Fetch status on mount ──────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/rag/status');
      if (r.ok) {
        const data = await safeJson(r);
        setStatus(data);
      }
    } catch { /* server not up yet — ignore */ }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // ── Scroll to bottom on new messages ──────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  };

  // ── Index repository ───────────────────────────────────────────────────────
  const handleIndex = async () => {
    if (!status.hasApiKey) {
      setMessages(prev => [...prev, {
        role   : 'system',
        content: 'Falta la variable GOOGLE_GEMINI_API_KEY en el archivo .env del servidor. Añádela y reinicia el servidor.',
        isError: true,
      }]);
      return;
    }
    setIndexing(true);
    try {
      const r    = await fetch('/api/rag/index', { method: 'POST' });
      const data = await safeJson(r);
      await fetchStatus();
      if (r.ok) {
        setMessages(prev => [...prev, {
          role   : 'system',
          content: `Indexado completado: ${data.indexed ?? '?'} queries procesadas${(data.errors ?? 0) > 0 ? `, ${data.errors} con errores` : ''}.`,
        }]);
      } else {
        setMessages(prev => [...prev, {
          role   : 'system',
          content: `Error al indexar: ${data.error ?? 'Error desconocido'}`,
          isError: true,
        }]);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role   : 'system',
        content: e.message,
        isError: true,
      }]);
    }
    setIndexing(false);
  };

  // ── Submit question ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setInput('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const r = await fetch('/api/rag/query', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ question }),
      });
      const data = await safeJson(r);
      if (!r.ok) throw new Error(data.error ?? 'Error del servidor');
      setMessages(prev => [...prev, {
        role   : 'assistant',
        content: data.answer,
        sources: data.sources,
      }]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role   : 'system',
        content: e.message,
        isError: true,
      }]);
    }

    setLoading(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const toggleSources = (idx: number) => {
    setOpenSources(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  // ── Format last indexed date ───────────────────────────────────────────────
  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    } catch { return iso; }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[620px] bg-white rounded-3xl border border-gray-100 shadow-premium overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-alquid-navy px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-alquid-blue rounded-xl flex items-center justify-center shadow-md">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm leading-tight">Asistente de Queries</h3>
            <p className="text-gray-400 text-xs leading-tight mt-0.5">
              {!status.hasApiKey
                ? <span className="text-amber-400">GOOGLE_GEMINI_API_KEY no configurada</span>
                : status.chunksCount > 0
                  ? `${status.chunksCount} queries indexadas${status.lastIndexedAt ? ' · ' + formatDate(status.lastIndexedAt) : ''}`
                  : 'Sin indexar — pulsa el botón para comenzar'}
            </p>
          </div>
        </div>

        <button
          onClick={handleIndex}
          disabled={indexing}
          title="Genera embeddings de todas las queries del repositorio"
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {indexing
            ? <><Loader2 size={13} className="animate-spin" /> Indexando…</>
            : <><RefreshCw size={13} /> Indexar Repositorio</>}
        </button>
      </div>

      {/* ── Messages area ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/60 custom-scrollbar">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 animate-fade-in py-8">
            <Cpu size={44} className="mb-4 text-gray-200" />
            <p className="font-bold text-gray-600 mb-1 text-base">Pregunta sobre tu repositorio SQL</p>
            <p className="text-sm max-w-sm leading-relaxed text-gray-400">
              ¿Qué tabla usa el informe X? ¿Qué parámetros necesita Y? ¿Cuál es la diferencia entre PRE y PRO para Z?
            </p>
            {!status.hasApiKey && (
              <div className="mt-5 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-xl max-w-sm">
                <AlertCircle size={13} />
                Falta <code className="font-mono font-bold mx-1">GOOGLE_GEMINI_API_KEY</code> en el <code className="font-mono font-bold mx-1">.env</code>. Añádela y reinicia el servidor.
              </div>
            )}
            {status.hasApiKey && status.chunksCount === 0 && (
              <div className="mt-5 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
                <Info size={13} />
                Indexa el repositorio primero usando el botón de arriba.
              </div>
            )}
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => (
          <div key={i}>
            {/* User bubble */}
            {msg.role === 'user' && (
              <div className="flex justify-end">
                <div className="max-w-[80%] bg-alquid-navy text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed shadow-sm">
                  {msg.content}
                </div>
              </div>
            )}

            {/* Assistant bubble */}
            {msg.role === 'assistant' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-alquid-blue rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={14} className="text-white" />
                  </div>
                  <div className="flex-1 bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 leading-relaxed shadow-sm whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="ml-10">
                    <button
                      onClick={() => toggleSources(i)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-alquid-blue transition-colors font-medium"
                    >
                      <Database size={11} />
                      {msg.sources.length} fuente{msg.sources.length > 1 ? 's' : ''} consultada{msg.sources.length > 1 ? 's' : ''}
                      {openSources.has(i) ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>

                    {openSources.has(i) && (
                      <div className="mt-2 space-y-1.5 animate-fade-in">
                        {msg.sources.map((src, si) => (
                          <div key={si} className="flex items-start gap-2 text-xs bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
                            <span className="w-4 h-4 rounded-full bg-alquid-blue/10 text-alquid-blue flex items-center justify-center font-bold flex-shrink-0 text-[10px] mt-0.5">
                              {si + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-gray-700 block truncate">{src.filename}</span>
                              <span className="text-gray-400">
                                {src.client}{src.geography ? ` / ${src.geography}` : ''} · {src.env} · {src.reportName}
                              </span>
                            </div>
                            <span className="text-gray-300 font-mono ml-2 flex-shrink-0 text-[10px] mt-0.5">
                              {(src.score * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* System/notice bubble */}
            {msg.role === 'system' && (
              <div className="flex justify-center">
                <div className={`flex items-center gap-2 text-xs px-4 py-2 rounded-full ${
                  msg.isError
                    ? 'text-red-600 bg-red-50 border border-red-100'
                    : 'text-emerald-700 bg-emerald-50 border border-emerald-100'
                }`}>
                  {msg.isError
                    ? <AlertCircle size={12} />
                    : <CheckCircle2 size={12} />}
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-alquid-blue rounded-lg flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                {[0, 150, 300].map(delay => (
                  <span
                    key={delay}
                    className="w-2 h-2 bg-alquid-blue/40 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ─────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 p-4 border-t border-gray-100 bg-white flex gap-3 items-end"
      >
        <textarea
          ref={textareaRef}
          value={input}
          rows={1}
          onChange={e => { setInput(e.target.value); resizeTextarea(); }}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu pregunta… (Enter para enviar, Shift+Enter nueva línea)"
          className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-alquid-blue/30 focus:border-alquid-blue transition-all placeholder-gray-400 overflow-hidden"
          style={{ minHeight: '44px', maxHeight: '128px' }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-3 bg-alquid-navy text-white rounded-xl hover:bg-opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
          title="Enviar pregunta"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default RagChat;
