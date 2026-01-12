
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Auth: React.FC = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                navigate('/update-password');
            } else if (session) {
                navigate('/home');
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate('/home');
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name,
                        },
                    },
                });
                if (error) throw error;
                // Check if email confirmation is required, usually Supabase defaults to "check email"
                // For now we assume auto-login or redirect to a "check email" instruction if needed.
                // However, signUp usually returns a session if email confirmation is off, OR no session if on.
                alert('Conta criada com sucesso! Verifique seu email se necessário.');
                navigate('/home');
            }
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-primary to-primary-dark">
            {/* Header com Logo */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 pt-16 pb-8">
                <div className="size-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-6">
                    <span className="material-symbols-outlined text-primary text-5xl">shopping_cart</span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">SmartList</h1>
                <p className="text-white/70 text-center">Sua lista de compras inteligente</p>
            </div>

            {/* Card de Login/Cadastro */}
            <div className="bg-white dark:bg-surface-dark rounded-t-[40px] px-8 py-10 shadow-2xl">
                {/* Tabs */}
                <div className="flex h-12 w-full items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-8">
                    <button
                        onClick={() => setIsLogin(true)}
                        className={`flex-1 h-full rounded-lg text-sm font-bold transition-all ${isLogin ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500'}`}
                    >
                        Entrar
                    </button>
                    <button
                        onClick={() => setIsLogin(false)}
                        className={`flex-1 h-full rounded-lg text-sm font-bold transition-all ${!isLogin ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500'}`}
                    >
                        Criar Conta
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Campo Nome (apenas para cadastro) */}
                    {!isLogin && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Nome</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">person</span>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-divider dark:border-gray-700 rounded-xl pl-12 pr-4 py-4 text-base font-medium focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Seu nome completo"
                                    required={!isLogin}
                                />
                            </div>
                        </div>
                    )}

                    {/* Campo Email */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Email</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">mail</span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-divider dark:border-gray-700 rounded-xl pl-12 pr-4 py-4 text-base font-medium focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="seu@email.com"
                                required
                            />
                        </div>
                    </div>

                    {/* Campo Senha */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Senha</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">lock</span>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-divider dark:border-gray-700 rounded-xl pl-12 pr-4 py-4 text-base font-medium focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {/* Link Esqueci a Senha (apenas para login) */}
                    {isLogin && (
                        <button
                            type="button"
                            onClick={async () => {
                                if (!email) {
                                    alert('Por favor, preencha o campo de email para recuperar sua senha.');
                                    return;
                                }
                                setLoading(true);
                                try {
                                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                                        redirectTo: `${window.location.origin}/update-password`,
                                    });
                                    if (error) throw error;
                                    alert('Email de recuperação enviado! Verifique sua caixa de entrada.');
                                } catch (error: any) {
                                    alert('Erro ao enviar email: ' + error.message);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            className="text-sm text-primary font-semibold text-right hover:underline"
                        >
                            Esqueceu a senha?
                        </button>
                    )}

                    {/* Botão Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span>Carregando...</span>
                        ) : (
                            <>
                                <span>{isLogin ? 'Entrar' : 'Criar Conta'}</span>
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Divisor */}
                <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-divider dark:bg-gray-700"></div>
                    <span className="text-xs font-medium text-gray-400">ou continue com</span>
                    <div className="flex-1 h-px bg-divider dark:bg-gray-700"></div>
                </div>

                {/* Botões Sociais */}
                <div className="flex gap-3">
                    <button
                        onClick={() => supabase.auth.signInWithOAuth({
                            provider: 'google',
                            options: {
                                redirectTo: window.location.origin
                            }
                        })}
                        type="button"
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-divider dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <svg className="size-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span className="font-semibold text-sm">Google</span>
                    </button>

                </div>
            </div>
        </div>
    );
};

export default Auth;
