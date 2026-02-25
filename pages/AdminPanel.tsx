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
                <div className="bg-white rounded-3xl p-8 shadow-premium border border-gray-100 max-w-2xl">
                    <h3 className="text-xl font-bold text-alquid-navy mb-6 flex items-center gap-2">
                        <UserPlus size={22} className="text-alquid-blue" />
                        Habilitar Nuevo Usuario
                    </h3>
                    <form onSubmit={handleAddUser} className="flex gap-4">
                        <div className="flex-1 relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="email"
                                placeholder="ejemplo@nfq.es"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl premium-input text-gray-700 outline-none"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-alquid-navy hover:bg-opacity-90 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-alquid-navy/20 transition-all active:scale-95 whitespace-nowrap"
                        >
                            Dar de Alta
                        </button>
                    </form>
                    <p className="text-xs text-gray-400 mt-4">
                        * Los usuarios añadidos podrán acceder con su cuenta de Google de @nfq.es automáticamente.
                    </p>
                </div>

                {/* Tabla de Usuarios */}
                <div className="bg-white rounded-3xl shadow-premium border border-gray-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <UserCheck size={20} className="text-alquid-blue" />
                            Usuarios con Acceso
                        </h3>
                        <span className="text-xs font-bold text-gray-400 bg-white border border-gray-100 px-3 py-1 rounded-full">
                            {users.length} Registrados
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 text-gray-400 text-[10px] uppercase tracking-widest font-black">
                                    <th className="px-8 py-4">Usuario</th>
                                    <th className="px-8 py-4">Rol</th>
                                    <th className="px-8 py-4">Habilitado el</th>
                                    <th className="px-8 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-12 text-center text-gray-400 italic">
                                            Cargando lista de usuarios...
                                        </td>
                                    </tr>
                                ) : users.map((u) => (
                                    <tr key={u.id} className="hover:bg-alquid-gray10/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-alquid-blue flex items-center justify-center font-bold shadow-sm">
                                                    {u.email[0].toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-gray-700">{u.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${u.role === 'admin' ? 'bg-alquid-navy text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-gray-400 font-medium font-mono">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} />
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {u.role !== 'admin' && (
                                                <button
                                                    onClick={() => handleRemoveUser(u.email)}
                                                    className="p-2 text-gray-300 hover:text-alquid-orange hover:bg-orange-50 rounded-xl transition-all"
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
