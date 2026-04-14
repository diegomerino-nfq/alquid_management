import React, { useEffect, useState } from 'react';
import { useGlobalState } from '../context/GlobalStateContext';
import { LogIn, ShieldAlert } from 'lucide-react';
import axios from 'axios';

const LoginPage: React.FC = () => {
    const { setUser, addLog } = useGlobalState();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Initialize Google Translate-like button
        /* global google */
        const handleCredentialResponse = async (response: any) => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.post('/api/auth/google/verify', {
                    token: response.credential
                });

                setUser(res.data);
                addLog('SISTEMA', 'LOGIN_EXITOSO', `Usuario conectado: ${res.data.email}`, 'SUCCESS');
            } catch (err: any) {
                console.error('Login error full detail:', err);
                const backendError = err.response?.data?.error;
                const axiosError = err.message;
                setError(`[V3] ${backendError || axiosError}. Intenta recargar la página.`);
                addLog('SISTEMA', 'LOGIN_FALLIDO', `Fallo [V3]: ${backendError || axiosError}`, 'ERROR');
            } finally {
                setLoading(false);
            }
        };

        // @ts-ignore
        google.accounts.id.initialize({
            client_id: "492707531053-5l8vhci6q2jsflim9lpog5rb5o9sg44i.apps.googleusercontent.com",
            callback: handleCredentialResponse,
        });

        // @ts-ignore
        google.accounts.id.renderButton(
            document.getElementById("googleBtn"),
            { theme: "outline", size: "large", width: 280 }
        );
    }, [setUser, addLog]);

    return (
        <div className="min-h-screen bg-nafra-bg nafra-grid flex items-center justify-center p-4 text-nafra-text">
            <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-nafra-border bg-nafra-card shadow-premium animate-fade-in">
                <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="relative overflow-hidden border-b border-nafra-border p-10 lg:border-b-0 lg:border-r">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(41,124,242,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(41,124,242,0.08),transparent_30%)]"></div>
                        <div className="relative z-10">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-nafra-border-light bg-nafra-surface px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-nafra-text-dim">
                                NFQ Advisory · análisis de resultados financieros
                            </div>
                            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-nafra-accent text-white shadow-lg shadow-nafra-accent/20">
                                <LogIn size={28} />
                            </div>
                            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-nafra-text">
                                ALQUID Suite.
                            </h1>
                            <p className="mt-4 max-w-xl text-sm leading-7 text-nafra-text-dim">
                                Accede a la plataforma de gestión de informes, extracción SQL, versionado y validación técnica desde un entorno unificado orientado a producción.
                            </p>

                            <div className="mt-10 grid gap-3 sm:grid-cols-3">
                                { [
                                    ['Descarga de informes', 'Gestión de reportes'],
                                    ['Extracción de consultas', 'Extracción SQL avanzada'],
                                    ['Versionado por entorno', 'Control de versiones'],
                                ].map(([title, text]) => (
                                    <div key={title} className="rounded-xl border border-nafra-border bg-nafra-surface/80 p-4">
                                        <div className="text-[11px] uppercase tracking-[0.2em] text-nafra-text-muted">{title}</div>
                                        <div className="mt-2 text-sm font-medium text-nafra-text">{text}</div>
                                    </div>
                                )) }
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col justify-center p-10">
                        <div className="mb-6">
                            <div className="text-[11px] uppercase tracking-[0.28em] text-nafra-text-muted">Acceso seguro</div>
                            <h2 className="mt-2 text-2xl font-semibold text-nafra-text">Iniciar sesión</h2>
                            <p className="mt-2 text-sm leading-6 text-nafra-text-dim">Utiliza tu cuenta corporativa de NFQ para entrar en la suite.</p>
                        </div>

                        {error && (
                            <div className="mb-6 flex items-center gap-3 rounded-xl border border-nafra-danger/30 bg-nafra-danger/10 p-4 text-sm text-nafra-danger">
                                <ShieldAlert size={18} className="shrink-0" />
                                <div className="font-medium">{error}</div>
                            </div>
                        )}

                        <div className="rounded-2xl border border-nafra-border bg-nafra-surface p-6">
                            <div id="googleBtn" className="min-h-[44px] flex justify-center"></div>

                            {loading && (
                                <div className="mt-6 flex flex-col items-center gap-4 py-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-2 h-2 bg-nafra-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-nafra-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-nafra-accent rounded-full animate-bounce"></div>
                                    </div>
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-nafra-text-muted">Autenticando usuario...</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 text-[10px] uppercase tracking-[0.22em] text-nafra-text-muted">
                            © 2026 NFQ Risk Solutions · Data Intelligence Layer
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
