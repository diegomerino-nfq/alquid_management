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
        <div className="min-h-screen bg-alquid-gray25 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-premium overflow-hidden border border-gray-100 animate-fade-in relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-alquid-blue/5 rounded-full blur-2xl -mr-16 -mt-16"></div>

                <div className="p-12 pb-6 text-center">
                    <div className="w-24 h-24 bg-alquid-navy rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-alquid-navy/20 group hover:rotate-[5deg] transition-transform duration-500">
                        <LogIn size={44} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-ubuntu font-bold text-alquid-navy mb-3 tracking-tight">ALQUID <span className="text-alquid-blue">Suite.</span></h1>
                    <p className="text-gray-400 font-medium leading-relaxed">Accede a la plataforma de gestión de datos corporativos de NFQ.</p>
                </div>

                <div className="p-12 pt-4 space-y-8 flex flex-col items-center">
                    {error && (
                        <div className="w-full p-5 bg-red-50 border border-red-100 rounded-[1.5rem] flex items-center gap-4 text-red-600 animate-shake shadow-sm shadow-red-500/5">
                            <ShieldAlert size={22} className="shrink-0" />
                            <div className="text-sm font-bold">{error}</div>
                        </div>
                    )}

                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-alquid-blue to-alquid-navy rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                        <div id="googleBtn" className="relative min-h-[44px] flex justify-center"></div>
                    </div>

                    {loading && (
                        <div className="flex flex-col items-center gap-4 py-2">
                            <div className="flex gap-1.5">
                                <div className="w-2 h-2 bg-alquid-blue rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-alquid-blue rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-alquid-blue rounded-full animate-bounce"></div>
                            </div>
                            <span className="text-xs font-black text-alquid-navy uppercase tracking-[0.2em] opacity-50">Autenticando usuario...</span>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-gray-50/50 border-t border-gray-100/50 text-center">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                        © 2026 NFQ Risk Solutions • <span className="text-alquid-navy/30">Data Intelligence Layer</span>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
