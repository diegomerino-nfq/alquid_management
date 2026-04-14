import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Shield, Mail, Calendar, UserCheck } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import axios from 'axios';
import { useGlobalState } from '../context/GlobalStateContext';

interface User {
    id: number;
    email: string;
    role: string;
    created_at: string;
}

const AdminPanel: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const { addLog } = useGlobalState();

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/admin/users');
            setUsers(res.data);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim()) return;

        try {
            await axios.post('/api/admin/users', { email: newEmail.toLowerCase(), role: 'user' });
            setNewEmail('');
            fetchUsers();
            addLog('SISTEMA', 'USUARIO_AÑADIDO', `Se ha habilitado acceso para: ${newEmail}`, 'SUCCESS');
        } catch (err: any) {
            alert('Error al añadir usuario: ' + err.message);
        }
    };

    const handleRemoveUser = async (email: string) => {
        if (email === 'diego.merino@nfq.es') {
            alert('No puedes eliminar al administrador principal.');
            return;
        }
        if (!confirm(`¿Estás seguro de que quieres revocar el acceso a ${email}?`)) return;

        try {
            await axios.delete(`/api/admin/users/${email}`);
            fetchUsers();
            addLog('SISTEMA', 'USUARIO_ELIMINADO', `Se ha revocado el acceso para: ${email}`, 'WARNING');
        } catch (err: any) {
            alert('Error al eliminar usuario: ' + err.message);
        }
    };

    return (
        <div className="h-full flex flex-col animate-fade-in">
            <PageHeader
                title="Gestión de Accesos"
                subtitle="Administra los correos corporativos autorizados para la suite"
                icon={<Shield size={20} />}
            />

            <div className="flex-1 p-6 md:p-8 space-y-8">
                {/* Formulario de Alta */}
                <div className="bg-nafra-card rounded-2xl p-8 shadow-premium border border-nafra-border max-w-2xl">
                    <h3 className="text-lg font-bold text-nafra-text mb-6 flex items-center gap-2">
                        <UserPlus size={20} className="text-nafra-accent" />
                        Habilitar Nuevo Usuario
                    </h3>
                    <form onSubmit={handleAddUser} className="flex gap-4">
                        <div className="flex-1 relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-nafra-text-muted" size={18} />
                            <input
                                type="email"
                                placeholder="ejemplo@nfq.es"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-nafra-surface border border-nafra-border rounded-xl text-nafra-text placeholder-nafra-text-muted outline-none focus:ring-2 focus:ring-nafra-accent/30 focus:border-nafra-accent transition"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-nafra-accent hover:bg-nafra-accent-dim text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 whitespace-nowrap"
                        >
                            Dar de Alta
                        </button>
                    </form>
                    <p className="text-xs text-nafra-text-muted mt-4">
                        * Los usuarios añadidos podrán acceder con su cuenta de Google de @nfq.es automáticamente.
                    </p>
                </div>

                {/* Tabla de Usuarios */}
                <div className="bg-nafra-card rounded-2xl shadow-premium border border-nafra-border overflow-hidden">
                    <div className="px-8 py-5 border-b border-nafra-border flex justify-between items-center bg-nafra-surface">
                        <h3 className="font-bold text-nafra-text flex items-center gap-2">
                            <UserCheck size={18} className="text-nafra-accent" />
                            Usuarios con Acceso
                        </h3>
                        <span className="text-xs font-semibold text-nafra-text-muted bg-nafra-surface border border-nafra-border px-3 py-1 rounded-full">
                            {users.length} Registrados
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-nafra-text-muted text-[10px] uppercase tracking-widest font-bold border-b border-nafra-border">
                                    <th className="px-8 py-4">Usuario</th>
                                    <th className="px-8 py-4">Rol</th>
                                    <th className="px-8 py-4">Habilitado el</th>
                                    <th className="px-8 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-nafra-border">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-12 text-center text-nafra-text-muted italic">
                                            Cargando lista de usuarios...
                                        </td>
                                    </tr>
                                ) : users.map((u) => (
                                    <tr key={u.id} className="hover:bg-nafra-card-hover transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-nafra-accent/15 text-nafra-accent flex items-center justify-center font-bold text-sm">
                                                    {u.email[0].toUpperCase()}
                                                </div>
                                                <span className="font-medium text-nafra-text">{u.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${u.role === 'admin' ? 'bg-nafra-accent text-white' : 'bg-nafra-surface text-nafra-text-dim border border-nafra-border'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-nafra-text-dim font-medium">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-nafra-text-muted" />
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {u.role !== 'admin' && (
                                                <button
                                                    onClick={() => handleRemoveUser(u.email)}
                                                    className="p-2 text-nafra-text-muted hover:text-nafra-danger hover:bg-nafra-danger/10 rounded-xl transition-all"
                                                    title="Revocar acceso"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
