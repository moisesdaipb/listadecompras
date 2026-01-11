
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShoppingList } from '../types';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'personal' | 'shared'>('personal');
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name || user.email?.split('@')[0] || 'Usuário');
        setUserAvatar(profile.avatar_url || '');
      }
      setCurrentUserId(user.id);

      // Fetch Lists with Items
      const { data: listsData, error } = await supabase
        .from('lists')
        .select(`
                  *,
                  items (*)
              `)

        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching lists:', error);
      } else {
        // Transform data to match frontend types if necessary, though current schema aligns well.
        // Note: Backend 'items' are mapped to frontend 'ListItem[]'.
        // We need to map DB columns (snake_case) to frontend types (camelCase) if they differ.
        // Looking at types.ts:
        // ListItem: { id, name, quantity, estimatedPrice, actualPrice, isBought, category }
        // DB items: { id, name, quantity, estimated_price, actual_price, is_bought, category }
        // ShoppingList: { id, title, status, items, updatedAt, image, participants }

        const formattedLists: ShoppingList[] = listsData.map((l: any) => ({
          id: l.id,
          title: l.title,
          status: l.status,
          owner_id: l.owner_id, // Ensure this is mapped
          updatedAt: new Date(l.updated_at).toLocaleDateString(),
          image: l.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000', // Default image
          participants: [], // Shared lists not implemented yet
          items: l.items.map((i: any) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            estimatedPrice: Number(i.estimated_price) || 0,
            actualPrice: Number(i.actual_price) || 0,
            isBought: i.is_bought,
            category: i.category
          }))
        }));
        setLists(formattedLists);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLists = activeTab === 'personal'
    ? lists.filter(l => l.owner_id === currentUserId)
    : lists.filter(l => l.owner_id !== currentUserId);

  const activeLists = filteredLists.filter(l => l.status === 'active');
  const plannedLists = filteredLists.filter(l => l.status === 'planned');

  return (
    <div className="flex flex-col min-h-screen relative">
      <header className="sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-4 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={userAvatar || "https://lh3.googleusercontent.com/a/ACg8ocL_G5vJ_m1xG5v_7G_5G_5G_5G_5G=s96-c"}
                className="rounded-full size-10 border-2 border-white dark:border-surface-dark shadow-sm"
                alt="User profile"
              />
              <div className="absolute bottom-0 right-0 size-3 bg-primary rounded-full border-2 border-white dark:border-surface-dark"></div>
            </div>
            <div>
              <h2 className="text-text-main dark:text-white text-xl font-bold leading-tight tracking-tight">Olá, {userName}</h2>
              <p className="text-xs text-text-secondary dark:text-gray-400 font-medium">{loading ? 'Carregando...' : 'Vamos às compras?'}</p>
            </div>
          </div>

        </div>
      </header>

      <main className="flex-1 px-4 pb-24">
        <div className="my-4">
          <div className="flex h-12 w-full items-center justify-center rounded-xl bg-gray-200 dark:bg-surface-dark p-1">
            <button
              onClick={() => setActiveTab('personal')}
              className={`flex-1 h-full rounded-lg text-sm font-semibold transition-all ${activeTab === 'personal' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500'}`}
            >
              Minhas Listas
            </button>
            <button
              onClick={() => setActiveTab('shared')}
              className={`flex-1 h-full rounded-lg text-sm font-semibold transition-all ${activeTab === 'shared' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500'}`}
            >
              Compartilhadas
            </button>
          </div>
        </div>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Ativas</h3>
            <button className="text-sm font-medium text-primary">Ver todas</button>
          </div>
          <div className="flex flex-col gap-4">
            {activeLists.map(list => (
              <div
                key={list.id}
                onClick={() => navigate(`/shopping/${list.id}`)}
                className="group relative flex flex-col gap-3 rounded-2xl bg-surface-light dark:bg-surface-dark p-4 shadow-sm border border-divider dark:border-gray-800 transition-all hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 flex-1">
                    <span className="inline-flex items-center w-fit rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary ring-1 ring-inset ring-primary/20">
                      Em Compra
                    </span>
                    <h4 className="text-lg font-bold leading-tight">{list.title}</h4>
                    <div className="flex items-center gap-1 mt-1 text-text-secondary dark:text-gray-400 text-sm">
                      <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
                      <span>{list.items.length} itens</span>
                      <span className="mx-1">•</span>
                      <span className="font-semibold text-text-main dark:text-gray-200">
                        R$ {list.items.reduce((acc, i) => acc + i.estimatedPrice, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="relative w-20 h-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                    <img src={list.image} className="absolute inset-0 size-full object-cover transition-transform group-hover:scale-110 duration-500" />
                  </div>
                </div>
                <div className="border-t border-divider dark:border-gray-700 pt-3 flex items-center justify-between">
                  <div className="flex -space-x-2 overflow-hidden">
                    {list.participants.map((url, i) => (
                      <img key={i} src={url} className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-surface-dark" />
                    ))}
                    {list.participants.length > 2 && <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 ring-2 ring-white dark:ring-surface-dark text-[10px] font-bold">+2</div>}
                  </div>
                  <div className="flex items-center text-xs text-gray-400">
                    <span className="material-symbols-outlined text-[14px] mr-1">schedule</span>
                    Atualizado há {list.updatedAt}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Planejadas</h3>
          </div>
          <div className="flex flex-col gap-3">
            {plannedLists.map(list => (
              <div
                key={list.id}
                onClick={() => navigate(`/editor/${list.id}`)}
                className="group flex items-center justify-between gap-4 rounded-2xl bg-surface-light dark:bg-surface-dark p-4 shadow-sm border border-divider dark:border-gray-800 transition-all hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex flex-col gap-1 flex-1">
                  <span className="w-fit inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                    Planejada
                  </span>
                  <p className="text-base font-bold leading-tight mt-1">{list.title}</p>
                  <p className="text-text-secondary dark:text-gray-400 text-sm">
                    Est: R$ {list.items.reduce((acc, i) => acc + i.estimatedPrice, 0).toFixed(2)} • {list.items.length} itens
                  </p>
                </div>
                <div className="size-16 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <img src={list.image} className="w-full h-full object-cover" />
                </div>
              </div>
            ))}

            <button
              onClick={() => navigate('/editor')}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-divider dark:border-gray-700 rounded-2xl mt-2 text-center opacity-60 hover:opacity-100 transition-opacity"
            >
              <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">add_shopping_cart</span>
              <p className="text-sm font-medium text-gray-500">Crie uma nova lista para começar</p>
            </button>
          </div>
        </section>
      </main>

      <div className="sticky bottom-4 z-30 pointer-events-none pb-20">
        <div className="flex justify-end pr-4 pointer-events-auto">
          <button
            onClick={() => navigate('/editor')}
            className="flex items-center justify-center size-14 rounded-full bg-primary text-white shadow-lg shadow-primary/40 hover:bg-primary-dark hover:scale-105 active:scale-95 transition-all duration-200 group"
          >
            <span className="material-symbols-outlined text-3xl group-hover:rotate-90 transition-transform">add</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
