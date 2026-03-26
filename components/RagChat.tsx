import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot, Send, RefreshCw, ChevronDown, ChevronUp,
  Loader2, Cpu, Database, AlertCircle, CheckCircle2, Info, Trash2
} from 'lucide-react';
import { useGlobalState, RagMessage as Message, RagSource as Source, RagStatusData } from '../context/GlobalStateContext';

// ─── Lightweight Markdown renderer ────────────────────────────────────────────
// Handles: **bold**, `code`, ```code blocks```, # headers, - / * lists, numbered lists
const MarkdownContent: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  const renderInline = (str: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let last = 0, m: RegExpExecArray | null;
    let key = 0;
    while ((m = re.exec(str)) !== null) {
      if (m.index > last) parts.push(str.slice(last, m.index));
      const tok = m[0];
      if (tok.startsWith('`')) parts.push(<code key={key++} className="bg-gray-100 text-alquid-blue font-mono text-[11px] px-1.5 py-0.5 rounded">{tok.slice(1, -1)}</code>);
      else if (tok.startsWith('**')) parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
      else if (tok.startsWith('*')) parts.push(<em key={key++}>{tok.slice(1, -1)}</em>);
      last = m.index + tok.length;
    }
    if (last < str.length) parts.push(str.slice(last));
    return parts;
  };

  while (i < lines.length) {
    const line = lines[i];
    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={i} className="my-2 rounded-xl overflow-hidden border border-gray-200">
          {lang && <div className="bg-gray-100 text-gray-400 text-[10px] font-mono px-3 py-1 border-b border-gray-200">{lang}</div>}
          <pre className="bg-gray-950 text-gray-100 text-xs font-mono p-3 overflow-x-auto leading-relaxed whitespace-pre">{codeLines.join('\n')}</pre>
        </div>
      );
      i++;
      continue;
    }
    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const cls = level === 1 ? 'text-base font-black text-alquid-navy mt-3 mb-1' : level === 2 ? 'text-sm font-bold text-alquid-navy mt-2 mb-1' : 'text-sm font-semibold text-gray-700 mt-1';
      elements.push(<div key={i} className={cls}>{renderInline(headingMatch[2])}</div>);
      i++; continue;
    }
    // Unordered list item
    const ulMatch = line.match(/^(\s*)[*\-]\s+(.+)/);
    if (ulMatch) {
      elements.push(
        <div key={i} className="flex items-start gap-2 text-sm leading-relaxed">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-alquid-blue flex-shrink-0"></span>
          <span>{renderInline(ulMatch[2])}</span>
        </div>
      );
      i++; continue;
    }
    // Ordered list item
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)/);
    if (olMatch) {
      const num = line.match(/^(\s*)(\d+)\./)?.[2] ?? '1';
      elements.push(
        <div key={i} className="flex items-start gap-2 text-sm leading-relaxed">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-alquid-blue/10 text-alquid-blue text-[10px] font-bold flex items-center justify-center mt-0.5">{num}</span>
          <span>{renderInline(olMatch[2])}</span>
        </div>
      );
      i++; continue;
    }
    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="my-2 border-gray-200" />);
      i++; continue;
    }
    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-1" />);
      i++; continue;
    }
    // Normal paragraph
    elements.push(<p key={i} className="text-sm leading-relaxed">{renderInline(line)}</p>);
    i++;
  }
  return <div className="space-y-1">{elements}</div>;
};

// ─── Geo/env detector (mirrors rag.ts logic, runs on frontend) ────────────────
const GEO_MAP: Record<string, string> = {
  colombia: 'Colombia', argentina: 'Argentina', peru: 'Perú', perú: 'Perú',
  suiza: 'Suiza', switzerland: 'Suiza', mexico: 'México', méxico: 'México',
  brasil: 'Brasil', brazil: 'Brasil', chile: 'Chile', turquia: 'Turquía',
  turquía: 'Turquía', turkey: 'Turquía',
};
function detectGeo(text: string): string | null {
  const q = text.toLowerCase();
  for (const [kw, canonical] of Object.entries(GEO_MAP)) {
    if (q.includes(kw)) return canonical;
  }
  return null;
}
function detectEnv(text: string): 'PRO' | 'PRE' | null {
  const q = text.toLowerCase();
  if (/\bpro\b/.test(q)) return 'PRO';
  if (/\bpre\b/.test(q)) return 'PRE';
  return null;
}
function detectClient(text: string): string | null {
  return text.toLowerCase().includes('bbva') ? 'BBVA' : null;
}

// ─── Component ────────────────────────────────────────────────────────────────

const RagChat: React.FC = () => {
  const {
    ragMessages: messages, setRagMessages: setMessages,
    ragStatus: status, setRagStatus: setStatus,
    ragActiveFilters, setRagActiveFilters,
  } = useGlobalState();
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
        if (data.quotaExhausted) {
          const pendingLeft = (data.errors ?? 0);
          setMessages(prev => [...prev, {
            role   : 'system',
            content: `⚠️ Cuota diaria de embeddings agotada (límite: 1000/día en capa gratuita).\n\n` +
                     `✅ Ya indexados: ${data.skipped ?? 0} chunks\n` +
                     `🕐 Pendientes hoy: ${pendingLeft} (se indexarán automáticamente mañana al pulsar el botón)\n\n` +
                     `El chat ya funciona con los ${data.skipped ?? 0} chunks disponibles.`,
            isError: false,
          }]);
        } else {
          const parts: string[] = [];
          if ((data.indexed ?? 0) > 0) parts.push(`✅ ${data.indexed} queries nuevas indexadas`);
          if ((data.skipped ?? 0) > 0) parts.push(`⏭️ ${data.skipped} ya estaban indexadas`);
          if ((data.errors ?? 0) > 0) parts.push(`⚠️ ${data.errors} con errores`);
          setMessages(prev => [...prev, {
            role   : 'system',
            content: parts.length > 0 ? parts.join(' · ') : 'Indexado completado.',
          }]);
        }
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

    // Detect geography/env/client mentioned in this question.
    // If the question doesn't mention them, inherit from the active session filters.
    // This makes follow-up questions like "y ese informe?" keep Suiza as active geography.
    const effectiveFilters = {
      geography: detectGeo(question)   ?? ragActiveFilters.geography,
      env:       detectEnv(question)   ?? ragActiveFilters.env,
      client:    detectClient(question) ?? ragActiveFilters.client,
    };
    // Persist the resolved filters so the next question inherits them too
    setRagActiveFilters(effectiveFilters);

    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const r = await fetch('/api/rag/query', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ question, filters: effectiveFilters, history }),
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

  const handleClear = () => {
    setMessages([]);
    setRagActiveFilters({ geography: null, env: null, client: null });
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
    <div className="flex flex-col h-[680px] bg-white rounded-3xl border border-gray-100 shadow-premium overflow-hidden">

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
                  ? <>
                      {`${status.chunksCount} queries indexadas`}
                      {ragActiveFilters.geography &&
                        <span className="ml-1 text-alquid-blue font-semibold">
                          {' · '}{ragActiveFilters.geography}{ragActiveFilters.env ? ' / ' + ragActiveFilters.env : ''}
                        </span>
                      }
                    </>
                  : 'Sin indexar — pulsa el botón para comenzar'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            disabled={messages.length === 0}
            title="Limpiar conversación y reiniciar contexto de geografía"
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-400/30 text-gray-400 hover:text-red-300 text-xs font-medium rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 size={12} /> Limpiar
          </button>
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
                  <div className="flex-1 bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-gray-800 shadow-sm">
                    <MarkdownContent text={msg.content} />
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
