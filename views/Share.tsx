import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShoppingList } from '../types';

interface Participant {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string;
}

const Share: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (id) {
      checkUser();
      fetchList(id);
      fetchParticipants(id);
    }
  }, [id]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchList = async (listId: string) => {
    const { data, error } = await supabase
      .from('lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (error) {
      console.error(error);
      alert('Erro ao carregar lista. Talvez você não tenha permissão.');
      navigate('/home');
    } else {
      setList(data as any);
      setLoading(false);
    }
  };

  const fetchParticipants = async (listId: string) => {
    // Join list_participants com profiles
    const { data, error } = await supabase
      .from('list_participants')
      .select(`
        user_id,
        profiles ( email, full_name, avatar_url )
      `)
      .eq('list_id', listId);

    if (error) {
      console.error('Error fetching participants', error);
    } else if (data) {
      const formatted = data.map((d: any) => ({
        user_id: d.user_id,
        email: d.profiles?.email || 'Email oculto',
        full_name: d.profiles?.full_name || 'Sem nome',
        avatar_url: d.profiles?.avatar_url
      }));
      setParticipants(formatted);
    }
  };

  const [showInviteLink, setShowInviteLink] = useState(false);

  const handleShareApp = async () => {
    const text = `Ei! Baixe o app Lista de Compras para dividirmos as compras! Acesse: ${window.location.origin}`;
    if (navigator.share) {
      await navigator.share({ title: 'Lista de Compras', text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Link copiado! Envie para seu amigo(a).');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    setShowInviteLink(false);

    try {
      const input = inviteEmail.trim();
      let query = supabase.from('profiles').select('id').limit(1);

      // Simple detection: if contains '@', assume email, otherwise phone
      if (input.includes('@')) {
        query = query.eq('email', input.toLowerCase());
      } else {
        // Clean phone formatting for search if needed, currently direct match
        query = query.eq('phone', input);
      }

      const { data: users, error: searchError } = await query;

      if (searchError) throw searchError;

      if (!users || users.length === 0) {
        // User not found flow
        setShowInviteLink(true);
        setInviting(false);
        return;
      }

      const userIdToAdd = users[0].id;

      // 2. Check if already added
      if (participants.some(p => p.user_id === userIdToAdd) || (list && list.owner_id === userIdToAdd)) {
        alert('Usuário já está na lista.');
        setInviting(false);
        return;
      }

      // 3. Insert into list_participants
      const { error: inviteError } = await supabase
        .from('list_participants')
        .insert({
          list_id: id,
          user_id: userIdToAdd
        });

      if (inviteError) throw inviteError;

      alert('Convite enviado com sucesso!');
      setInviteEmail('');
      fetchParticipants(id!);
      setShowInviteLink(false);

    } catch (err: any) {
      console.error(err);
      alert('Erro ao convidar: ' + err.message);
    } finally {
      setInviting(false);
    }
  };

  const removeParticipant = async (userId: string) => {
    if (!window.confirm('Remover este usuário da lista?')) return;
    try {
      const { error } = await supabase
        .from('list_participants')
        .delete()
        .eq('list_id', id)
        .eq('user_id', userId);

      if (error) throw error;
      fetchParticipants(id!);
    } catch (err: any) {
      alert('Erro ao remover: ' + err.message);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  if (!list) return null;

  const isOwner = currentUser?.id === list.owner_id; // Need to map this correctly from DB type

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-white/90 dark:bg-surface-dark/90 px-4 py-3 backdrop-blur-md border-b border-divider">
        <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Colaboradores</h2>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="bg-primary/10 rounded-2xl p-6 text-center mb-8">
          <h1 className="text-xl font-bold text-primary mb-2">{list.title}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Gerencie quem pode ver e editar esta lista.
          </p>
        </div>

        {isOwner && (
          <section className="mb-8">
            <label className="text-sm font-bold text-gray-500 ml-1 mb-2 block">Adicionar Pessoa</label>
            <form onSubmit={handleInvite} className="bg-white dark:bg-surface-dark p-2 rounded-2xl border border-divider shadow-sm flex items-center gap-2 transition-all focus-within:ring-2 ring-primary/20">
              <span className="material-symbols-outlined text-gray-400 ml-2">person_add</span>
              <input
                type="text"
                placeholder="Email ou Telefone"
                className="flex-1 bg-transparent border-0 focus:ring-0 font-medium"
                value={inviteEmail}
                onChange={e => {
                  setInviteEmail(e.target.value);
                  setShowInviteLink(false);
                }}
              />
              <button
                type="submit"
                disabled={inviting || !inviteEmail}
                className="bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded-xl px-4 py-2 font-bold text-sm transition-colors"
              >
                {inviting ? '...' : 'Adicionar'}
              </button>
            </form>

            {showInviteLink && (
              <div className="mt-4 animate-in slide-in-from-top-2 fade-in duration-300">
                <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/50 flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-orange-500">warning</span>
                    <p className="text-sm font-medium">Usuário não encontrado.</p>
                  </div>
                  <p className="text-xs opacity-90">Essa pessoa ainda não tem conta no app. Envie um convite para ela se cadastrar!</p>
                  <button
                    onClick={handleShareApp}
                    className="bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined">share</span>
                    Convidar para o App
                  </button>
                </div>
              </div>
            )}

            {!showInviteLink && (
              <p className="text-xs text-gray-400 mt-2 ml-1">
                * Busque por email ou telefone cadastrado no perfil.
              </p>
            )}
          </section>
        )}
        <section>
          <label className="text-sm font-bold text-gray-500 ml-1 mb-2 block">Participantes ({participants.length})</label>
          <div className="flex flex-col gap-3">
            {participants.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                Ninguém além de você tem acesso.
              </div>
            ) : (
              participants.map(p => (
                <div key={p.user_id} className="flex items-center justify-between bg-white dark:bg-surface-dark p-3 rounded-2xl border border-divider">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=random`}
                      className="size-10 rounded-full"
                      alt={p.full_name}
                    />
                    <div>
                      <p className="text-sm font-bold">{p.full_name}</p>
                      <p className="text-xs text-gray-500">{p.email}</p>
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => removeParticipant(p.user_id)}
                      className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                    >
                      <span className="material-symbols-outlined">remove_circle_outline</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Share;
