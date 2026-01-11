import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthGuard: React.FC = () => {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [checkingProfile, setCheckingProfile] = useState(true);
    const [needsPhone, setNeedsPhone] = useState(false);
    const [phoneInput, setPhoneInput] = useState('');
    const [savingPhone, setSavingPhone] = useState(false);

    useEffect(() => {
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) checkProfile(session.user.id);
            else {
                setLoading(false);
                setCheckingProfile(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session) {
            await checkProfile(session.user.id);
        } else {
            setLoading(false);
            setCheckingProfile(false);
        }
    };

    const checkProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('phone')
                .eq('id', userId)
                .single();

            if (!data?.phone) {
                setNeedsPhone(true);
            } else {
                setNeedsPhone(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setCheckingProfile(false);
        }
    };

    const handleSavePhone = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate: Only numbers, length >= 10 (DDD + Number)
        // Usually Brazil: 11 digits (2 DDD + 9 phone)
        const cleanPhone = phoneInput.replace(/\D/g, '');

        if (cleanPhone.length < 10) {
            alert('Por favor, digite o DDD e o número completo (mínimo 10 dígitos).');
            return;
        }

        setSavingPhone(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ phone: cleanPhone })
                .eq('id', session.user.id);

            if (error) throw error;

            setNeedsPhone(false);
        } catch (error: any) {
            if (error.code === '23505') {
                alert('Este número de telefone já está cadastrado em outra conta.');
            } else {
                alert('Erro ao salvar telefone: ' + error.message);
            }
        } finally {
            setSavingPhone(false);
        }
    };

    if (loading || checkingProfile) {
        return (
            <div className="flex h-screen items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/" replace />;
    }

    if (needsPhone) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-background-light dark:bg-background-dark p-6 animate-in fade-in">
                <div className="w-full max-w-sm bg-white dark:bg-surface-dark p-8 rounded-3xl shadow-xl text-center">
                    <div className="mx-auto size-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
                        <span className="material-symbols-outlined text-3xl">smartphone</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Quase lá!</h2>
                    <p className="text-gray-500 mb-6 text-sm">
                        Para usar o app e colaborar em listas, precisamos do seu número de celular (com DDD).
                    </p>

                    <form onSubmit={handleSavePhone} className="flex flex-col gap-4">
                        <div className="text-left">
                            <label className="text-xs font-bold text-gray-500 ml-1 uppercase">Celular com DDD</label>
                            <input
                                type="tel"
                                placeholder="(11) 99999-9999"
                                value={phoneInput}
                                onChange={e => setPhoneInput(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-background-dark border border-divider rounded-xl p-3 mt-1 font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={savingPhone}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 active:scale-95"
                        >
                            {savingPhone ? 'Salvando...' : 'Concluir Cadastro'}
                        </button>
                        <button
                            type="button"
                            onClick={() => supabase.auth.signOut()}
                            className="text-xs text-gray-400 font-medium hover:text-red-500 transition-colors"
                        >
                            Sair e tentar com outra conta
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return <Outlet />;
};

export default AuthGuard;
