import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Profile: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState({
        full_name: '',
        email: '',
        phone: '',

        avatar_url: ''
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        getProfile();
    }, []);
    const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                return;
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Ensure bucket exists or handle error (assuming bucket 'avatars' exists)
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

            if (data) {
                setProfile(prev => ({ ...prev, avatar_url: data.publicUrl }));

                // Save immediately to DB
                if (user) {
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() })
                        .eq('id', user.id);

                    if (updateError) throw updateError;
                }
            }

        } catch (error: any) {
            alert('Erro ao fazer upload da imagem: ' + error.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const getProfile = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                navigate('/');
                return;
            }

            setUser(user);

            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, avatar_url, phone, email')
                .eq('id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                // If email is missing in profiles but present in auth, update it silently
                if (!data.email && user.email) {
                    supabase.from('profiles').update({ email: user.email }).eq('id', user.id).then(null, console.error);
                }

                setProfile({
                    full_name: data.full_name || '',
                    avatar_url: data.avatar_url || '',
                    phone: data.phone || '',
                    email: data.email || user.email || ''
                });
            } else {
                // Create profile if it doesn't exist
                const newProfile = {
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || '',
                    avatar_url: user.user_metadata?.avatar_url || ''
                };
                await supabase.from('profiles').upsert(newProfile);

                setProfile(prev => ({ ...prev, email: user.email || '' }));
            }

        } catch (error: any) {
            console.error('Error loading user data!', error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async () => {
        try {
            setSaving(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error('No user');

            const updates = {
                id: user.id,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                phone: profile.phone,
                email: user.email, // Ensure email is kept in sync
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase.from('profiles').upsert(updates);

            if (error) throw error;
            alert('Perfil atualizado com sucesso!');
        } catch (error: any) {
            alert('Erro ao atualizar perfil: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const handleDeleteAccount = async () => {
        if (!user) return;

        const code = Math.floor(1000 + Math.random() * 9000).toString();
        const userInput = prompt(
            `ATENÇÃO: Esta ação apagará TODOS os seus dados e listas permanentemente.\n\n` +
            `Para confirmar a exclusão, digite o código ${code} abaixo:`
        );

        if (userInput !== code) {
            if (userInput !== null) alert('Código incorreto. A exclusão foi cancelada.');
            return;
        }

        try {
            setLoading(true);

            // 1. Delete lists owned by user
            const { error: listsError } = await supabase
                .from('lists')
                .delete()
                .eq('owner_id', user.id);

            if (listsError) throw listsError;

            // 2. Delete profile
            const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user.id);

            if (profileError) throw profileError;

            // 3. Sign out
            await supabase.auth.signOut();
            alert('Sua conta e dados foram excluídos com sucesso.');
            navigate('/');

        } catch (error: any) {
            console.error('Error deleting account:', error);
            alert('Erro ao excluir dados: ' + error.message);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Carregando perfil...</div>;
    }

    return (
        <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
            <header className="sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-4 pt-12 pb-4 border-b border-divider flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span className="material-symbols-outlined">arrow_back_ios_new</span>
                </button>
                <h1 className="text-xl font-bold text-center">Meu Perfil</h1>
                <div className="w-9"></div> {/* Spacer for alignment */}
            </header>

            <main className="flex-1 px-4 py-8 pb-24">
                {/* Foto do Perfil */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative">
                        <img
                            src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=random`}
                            className="rounded-full size-28 border-4 border-primary/20 shadow-lg object-cover"
                            alt="Foto do perfil"
                        />
                        <button
                            className="absolute bottom-1 right-1 size-9 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary-dark transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <span className="material-symbols-outlined text-white text-lg animate-spin">refresh</span>
                            ) : (
                                <span className="material-symbols-outlined text-white text-lg">photo_camera</span>
                            )}
                        </button>
                        <input
                            type="file"
                            hidden
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={uploadAvatar}
                        />
                    </div>
                </div>

                {/* Dados do Usuário */}
                <div className="bg-white dark:bg-surface-dark rounded-2xl border border-divider dark:border-gray-800 p-5 mb-8 shadow-sm">
                    <div className="mb-5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Nome</label>
                        <input
                            type="text"
                            value={profile.full_name}
                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-divider dark:border-gray-700 rounded-xl px-4 py-3 text-base font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            placeholder="Seu nome"
                        />
                    </div>
                    <div className="mb-5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Email</label>
                        <input
                            type="email"
                            value={profile.email}
                            disabled
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-divider dark:border-gray-700 rounded-xl px-4 py-3 text-base font-medium text-gray-500 cursor-not-allowed"
                            placeholder="seu@email.com"
                        />
                        <p className="text-[10px] text-gray-400 mt-1 ml-1">O email não pode ser alterado.</p>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Telefone</label>
                        <input
                            type="tel"
                            value={profile.phone}
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-divider dark:border-gray-700 rounded-xl px-4 py-3 text-base font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            placeholder="(00) 00000-0000"
                        />
                    </div>
                </div>

                <button
                    onClick={updateProfile}
                    disabled={saving}
                    className="w-full mb-8 bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
                >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>

                {/* Botões de Ação Secundários */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        <span className="font-bold">Sair do App</span>
                    </button>
                    <button
                        onClick={handleDeleteAccount}
                        className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl border-2 border-red-50 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <span className="material-symbols-outlined">delete_forever</span>
                        <span className="font-bold">Excluir Conta</span>
                    </button>
                </div>
            </main>
        </div>
    );
};

export default Profile;
