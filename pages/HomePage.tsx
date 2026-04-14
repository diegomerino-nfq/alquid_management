import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Zap, Cpu, Download, Database, FileJson, Archive, Activity, ArrowRight, Sparkles } from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';

const HomePage: React.FC = () => {
   const navigate = useNavigate();
   const { user, userLogs, repositorySummary } = useGlobalState();

   const moduleCards = [
      {
         title: 'Descarga de Informes',
         description: 'Ejecuta consultas parametrizadas y exporta resultados por lote.',
         path: '/download',
         icon: <Download size={18} />,
      },
      {
         title: 'Extracción SQL',
         description: 'Convierte definiciones JSON en SQL normalizado listo para repositorio.',
         path: '/extract',
         icon: <Database size={18} />,
      },
      {
         title: 'Editor JSON',
         description: 'Fusiona carpetas SQL, plantillas y validaciones en un único flujo.',
         path: '/editor',
         icon: <FileJson size={18} />,
      },
      {
         title: 'Repositorio',
         description: 'Versiona entregables por cliente, geografía y entorno.',
         path: '/repository',
         icon: <Archive size={18} />,
      },
   ];

   const totalArchivos = repositorySummary.reduce((total: number, entry: { count: number }) => total + entry.count, 0);

   const stats = [
      { label: 'Eventos recientes', value: String(userLogs.length), hint: 'actividad auditada', accent: 'text-nafra-accent' },
      { label: 'Bloques repositorio', value: String(totalArchivos), hint: 'archivos en todos los entornos', accent: 'text-emerald-400' },
      { label: 'Usuario activo', value: user?.role === 'admin' ? 'ADMIN' : 'USER', hint: user?.email?.split('@')[0] || 'sesión', accent: 'text-nafra-warning' },
   ];

   // Agrupar el array plano por cliente y geografía
   const repoAgrupado = repositorySummary.reduce((acc: Record<string, Record<string, { env: string, count: number }[]>>, entry: { client: string, geography: string, env: string, count: number }) => {
      if (!acc[entry.client]) acc[entry.client] = {};
      if (!acc[entry.client][entry.geography]) acc[entry.client][entry.geography] = [];
      acc[entry.client][entry.geography].push({ env: entry.env, count: entry.count });
      return acc;
   }, {});

   const GEOGRAPHY_FLAGS: Record<string, string> = {
      'Argentina': 'ar', 'Colombia': 'co', 'Perú': 'pe', 'Peru': 'pe',
      'Suiza': 'ch', 'Luxemburgo': 'lu', 'España': 'es', 'Espana': 'es',
      'Nueva York': 'us', 'general': '',
   };

   return (
      <div className="min-h-full flex flex-col gap-6 animate-fade-in pb-10 text-nafra-text">
         <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
               <div className="text-[11px] uppercase tracking-[0.32em] text-nafra-text-muted mb-2">Inteligencia financiera</div>
               <h1 className="text-3xl font-semibold tracking-tight">Vista General</h1>
            </div>
            <button
               onClick={() => navigate('/documentation')}
               className="inline-flex items-center gap-2 rounded-lg border border-nafra-border bg-nafra-surface px-4 py-2 text-sm font-medium text-nafra-text-dim transition hover:border-nafra-accent hover:text-nafra-text"
            >
               <BookOpen size={15} /> Documentación
            </button>
         </div>

         <section className="relative overflow-hidden rounded-2xl border border-nafra-border bg-nafra-card nafra-grid px-6 py-6 shadow-premium">
            <div className="absolute inset-y-0 right-0 w-[32rem] bg-[radial-gradient(circle_at_center,rgba(41,124,242,0.18),transparent_58%)] pointer-events-none"></div>
            <div className="relative z-10 grid gap-6 lg:grid-cols-[1.6fr_0.9fr] lg:items-start">
               <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                     <Zap size={12} /> Online
                  </div>
                  <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-nafra-text">
                     Plataforma operativa para consultas, repositorio y validación técnica en un mismo panel.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-nafra-text-dim">
                     Bienvenido, {user?.email?.split('@')[0] || 'usuario'}. Aquí tienes el acceso rápido a los flujos activos de ALQUID y el asistente contextual para navegar informes, parámetros y diferencias entre entornos.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                     {stats.map((stat) => (
                        <div key={stat.label} className="rounded-xl border border-nafra-border bg-nafra-surface/80 p-4">
                           <div className="text-[11px] uppercase tracking-[0.22em] text-nafra-text-muted">{stat.label}</div>
                           <div className={`mt-2 text-2xl font-semibold ${stat.accent}`}>{stat.value}</div>
                           <div className="mt-1 text-xs text-nafra-text-dim">{stat.hint}</div>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="rounded-2xl border border-nafra-border bg-black/20 p-5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-nafra-text">
                     <Sparkles size={16} className="text-nafra-accent" /> Flujo recomendado
                  </div>
                  <div className="mt-4 space-y-3">
                     {['Selecciona plantilla o informe base', 'Lanza extracción o descarga por entorno', 'Valida cambios y publica en repositorio'].map((step, index) => (
                        <div key={step} className="flex items-start gap-3 rounded-xl border border-nafra-border bg-nafra-surface/70 px-4 py-3">
                           <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-nafra-accent/15 text-xs font-semibold text-nafra-accent">{index + 1}</div>
                           <div className="text-sm leading-6 text-nafra-text-dim">{step}</div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </section>

         <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-nafra-border bg-nafra-card p-5 shadow-premium">
               <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                     <div className="text-[11px] uppercase tracking-[0.28em] text-nafra-text-muted">Módulos operativos</div>
                     <h3 className="mt-1 text-lg font-semibold text-nafra-text">Accesos rápidos</h3>
                  </div>
                  <button
                     onClick={() => navigate('/activity')}
                     className="inline-flex items-center gap-2 rounded-lg border border-nafra-border bg-nafra-surface px-3 py-2 text-xs font-medium text-nafra-text-dim transition hover:border-nafra-accent hover:text-nafra-text"
                  >
                     <Activity size={14} /> Ver actividad
                  </button>
               </div>

               <div className="grid gap-3 md:grid-cols-2">
                  {moduleCards.map((card) => (
                     <button
                        key={card.title}
                        onClick={() => navigate(card.path)}
                        className="group rounded-xl border border-nafra-border bg-nafra-surface p-4 text-left transition hover:border-nafra-border-light hover:bg-nafra-card-hover"
                     >
                        <div className="flex items-start justify-between gap-3">
                           <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nafra-accent/12 text-nafra-accent">
                              {card.icon}
                           </div>
                           <ArrowRight size={16} className="mt-1 text-nafra-text-muted transition group-hover:translate-x-1 group-hover:text-nafra-accent" />
                        </div>
                        <div className="mt-4 text-base font-semibold text-nafra-text">{card.title}</div>
                        <p className="mt-2 text-sm leading-6 text-nafra-text-dim">{card.description}</p>
                     </button>
                  ))}
               </div>
            </div>

            <div className="rounded-2xl border border-nafra-border bg-nafra-card p-5 shadow-premium">
               <div className="text-[11px] uppercase tracking-[0.28em] text-nafra-text-muted">Contexto del repositorio</div>
               <h3 className="mt-1 text-lg font-semibold text-nafra-text">Entornos disponibles</h3>
               <div className="mt-4 space-y-3">
                  {Object.entries(repoAgrupado).map(([client, geographies]) => (
                     <div key={client} className="mb-4">
                        <div className="text-sm font-bold text-nafra-text mb-1">{client}</div>
                        {Object.entries(geographies).map(([geography, envs]) => (
                           <div key={geography} className="ml-3 mb-2">
                              <div className="flex items-center gap-2 mb-1">
                                 {GEOGRAPHY_FLAGS[geography] ? (
                                    <img
                                       src={`https://flagcdn.com/20x15/${GEOGRAPHY_FLAGS[geography]}.png`}
                                       srcSet={`https://flagcdn.com/40x30/${GEOGRAPHY_FLAGS[geography]}.png 2x`}
                                       width="20" height="15"
                                       alt={geography}
                                       className="rounded-sm shadow-sm"
                                    />
                                 ) : null}
                                 <div className="text-xs font-semibold text-nafra-text-dim uppercase tracking-wide">{geography}</div>
                              </div>
                              {envs.map(({ env, count }) => (
                                 <div key={env} className="ml-3 flex items-center justify-between rounded-lg border border-nafra-border bg-nafra-surface px-3 py-2 mb-1">
                                    <span className="text-xs uppercase tracking-widest text-nafra-text-muted">{env}</span>
                                    <span className="text-sm font-semibold text-nafra-accent">{count} <span className="text-nafra-text-dim text-xs font-normal">archivos</span></span>
                                 </div>
                              ))}
                           </div>
                        ))}
                     </div>
                  ))}
                  {repositorySummary.length === 0 && (
                     <div className="rounded-xl border border-dashed border-nafra-border-light bg-nafra-surface/60 px-4 py-6 text-sm text-nafra-text-dim">
                        Todavía no hay bloques de repositorio cargados en memoria de sesión.
                     </div>
                  )}
               </div>
            </div>
         </section>
      </div>
   );
};

export default HomePage;
