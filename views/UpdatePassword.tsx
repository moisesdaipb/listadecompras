import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const UpdatePassword: React.FC = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            alert('Senha atualizada com sucesso!');
            navigate('/home');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-primary to-primary-dark">
            <div className="flex-1 flex flex-col items-center justify-center px-8 pt-16 pb-8">
                <div className="size-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-6">
                    <span className="material-symbols-outlined text-primary text-5xl">lock_reset</span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Nova Senha</h1>
                <p className="text-white/70 text-center">Digite sua nova senha abaixo</p>
            </div>

            <div className="bg-white dark:bg-surface-dark rounded-t-[40px] px-8 py-10 shadow-2xl h-1/2">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Nova Senha</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">lock</span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-divider dark:border-gray-700 rounded-xl pl-12 pr-4 py-4 text-base font-medium focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Salvando...' : 'Atualizar Senha'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UpdatePassword;
