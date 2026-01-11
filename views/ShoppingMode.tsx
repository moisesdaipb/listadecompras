import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShoppingList, ListItem } from '../types';

const ShoppingMode: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [ownerName, setOwnerName] = useState('');

  useEffect(() => {
    if (id) {
      fetchList(id);
    }
  }, [id]);

  const fetchList = async (listId: string) => {
    try {
      const { data: listData, error } = await supabase
        .from('lists')
        .select('*, items(*), profiles!owner_id(full_name)')
        .eq('id', listId)
        .single();

      if (error) throw error;

      if (listData) {
        const items: ListItem[] = listData.items.map((i: any) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          estimatedPrice: Number(i.estimated_price),
          isBought: i.is_bought,
          category: i.category,
          actualPrice: i.actual_price ? Number(i.actual_price) : undefined
        }));

        setList({
          id: listData.id,
          title: listData.title,
          status: listData.status,
          items: items,
          updatedAt: listData.updated_at,
          owner_id: listData.owner_id
        });

        // Checking if profiles matches what we expect from the join query
        const ownerProfile = (listData as any).profiles;
        if (ownerProfile) {
          setOwnerName(ownerProfile.full_name);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateItemInDb = async (itemId: string, updates: any) => {
    const { error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', itemId);

    if (error) console.error('Error updating item:', error);
  };

  const handleToggleBuy = async (item: ListItem) => {
    if (item.isBought) {
      // Uncheck
      const updates = { is_bought: false, actual_price: null };
      setList(prev => !prev ? null : ({
        ...prev,
        items: prev.items.map(i => i.id === item.id ? { ...i, isBought: false, actualPrice: undefined } : i)
      }));
      await updateItemInDb(item.id, updates);
    } else {
      // Open modal to check
      setActiveItemId(item.id);
      setTempPrice(item.estimatedPrice.toString());
    }
  };

  const confirmPurchase = async () => {
    if (!activeItemId) return;

    const actualPriceVal = Number(tempPrice);
    const updates = { is_bought: true, actual_price: actualPriceVal };

    setList(prev => !prev ? null : ({
      ...prev,
      items: prev.items.map(i => i.id === activeItemId ? { ...i, isBought: true, actualPrice: actualPriceVal } : i)
    }));

    await updateItemInDb(activeItemId, updates);
    setActiveItemId(null);
  };

  const finishShopping = async () => {
    if (!list) return;
    if (!window.confirm("Tem certeza que deseja finalizar esta compra? A lista será marcada como concluída.")) return;

    const { error } = await supabase
      .from('lists')
      .update({ status: 'completed', updated_at: new Date() })
      .eq('id', list.id);

    if (error) {
      console.error("Error finishing list:", error);
      alert("Erro ao finalizar compra.");
      return;
    }
    navigate(`/summary/${list.id}`, { replace: true });
  };

  const handleShare = async () => {
    if (!list) return;
    const text = `🛒 Lista: ${list.title}\n\n` +
      list.items.map(i => `${i.isBought ? '✅' : '☐'} ${i.quantity}x ${i.name}`).join('\n') +
      `\n\n💰 Total Est.: R$ ${list.items.reduce((a, b) => a + (b.estimatedPrice * b.quantity), 0).toFixed(2)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: list.title,
          text: text
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Lista copiada para a área de transferência!');
    }
    setShowMenu(false);
  };

  if (loading) return <div className="p-10 text-center">Carregando lista...</div>;
  if (!list) return <div className="p-10 text-center">Lista não encontrada.</div>;

  const boughtCount = list.items.filter(i => i.isBought).length;
  const progress = list.items.length > 0 ? (boughtCount / list.items.length) * 100 : 0;
  const totalActual = list.items.reduce((acc, i) => acc + (i.actualPrice || (i.isBought ? i.estimatedPrice : 0)), 0);

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-md border-b border-divider shadow-sm">
        <div className="flex items-center px-4 py-3 justify-between">
          <button onClick={() => navigate('/home')} className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-divider shadow-sm">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-0.5">Total Gasto</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-semibold text-gray-500">R$</span>
              <span className="text-2xl font-extrabold tracking-tight">{totalActual.toFixed(2)}</span>
            </div>
            {ownerName && (
              <span className="text-[10px] text-gray-400 font-medium -mt-1">Criada por {ownerName}</span>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-divider shadow-sm"
            >
              <span className="material-symbols-outlined">more_vert</span>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-12 bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-divider p-2 min-w-[150px] z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => navigate(`/editor/${list.id}`)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                  Editar Lista
                </button>
                <button
                  onClick={handleShare}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">ios_share</span>
                  Compartilhar
                </button>
                <button
                  onClick={() => navigate(`/share/${list.id}`)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">group_add</span>
                  Colaboradores
                </button>
                <div className="h-px bg-divider my-1"></div>
                <button
                  onClick={async () => {
                    if (window.confirm('Excluir esta lista permanentemente?')) {
                      await supabase.from('lists').delete().eq('id', list.id);
                      navigate('/home');
                    }
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 text-sm font-medium flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                  Excluir
                </button>
              </div>
            )}
            {showMenu && (
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
            )}
          </div>
        </div>
        <div className="px-5 pb-4 pt-1">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 shadow-[0_0_8px_rgba(67,160,71,0.3)]"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-xs font-bold text-primary whitespace-nowrap">{boughtCount} / {list.items.length} itens</span>
          </div>
        </div>
      </header >

      <main className="flex-1 p-3 pt-4 pb-40">
        {['Hortifruti', 'Laticínios & Ovos', 'Açougue', 'Limpeza', 'Padaria', 'Geral'].map(cat => {
          const catItems = list.items.filter(i => i.category === cat || (!cat && i.category === 'Geral'));
          if (catItems.length === 0 && cat !== 'Geral') return null;
          return (
            <div key={cat} className="mb-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider px-2 py-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">category</span>
                {cat}
              </h3>
              <div className="flex flex-col gap-3">
                {catItems.map(item => {
                  const isActive = activeItemId === item.id;
                  return (
                    <div key={item.id} className={`group relative transition-all ${isActive ? 'z-20 scale-[1.02]' : ''}`}>
                      {!isActive ? (
                        <div
                          className={`flex items-center p-4 bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-divider transition-all ${item.isBought ? 'opacity-60' : 'opacity-100'}`}
                          onClick={() => handleToggleBuy(item)}
                        >
                          <div className="relative flex items-center justify-center mr-4">
                            <div className={`h-8 w-8 rounded-full border-2 transition-all flex items-center justify-center ${item.isBought ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                              {item.isBought && <span className="material-symbols-outlined text-white text-lg font-bold">check</span>}
                            </div>
                          </div>
                          <div className="flex flex-col flex-1">
                            <span className={`text-base font-bold ${item.isBought ? 'line-through text-gray-400' : ''}`}>{item.name}</span>
                            <span className="text-xs text-gray-500">{item.quantity} un • Est. R$ {item.estimatedPrice.toFixed(2)}</span>
                          </div>
                          {item.isBought && (
                            <span className="text-sm font-bold text-primary">R$ {item.actualPrice?.toFixed(2)}</span>
                          )}
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl ring-2 ring-primary p-4 overflow-hidden">
                          <div className="flex items-center mb-4">
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center mr-3">
                              <span className="material-symbols-outlined text-white text-lg font-bold">shopping_cart</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-base font-bold">{item.name}</span>
                              <span className="text-xs text-gray-500">Valor estimado: R$ {item.estimatedPrice.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                              <label className="absolute -top-2 left-2 px-1 bg-white dark:bg-surface-dark text-[10px] font-bold text-primary uppercase">Valor Real</label>
                              <div className="relative flex items-center">
                                <span className="absolute left-4 font-bold text-gray-400">R$</span>
                                <input
                                  autoFocus
                                  type="number"
                                  step="0.01"
                                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xl font-bold focus:ring-1 focus:ring-primary"
                                  value={tempPrice}
                                  onChange={(e) => setTempPrice(e.target.value)}
                                />
                              </div>
                            </div>
                            <button
                              onClick={confirmPurchase}
                              className="bg-primary text-white h-[54px] w-[54px] rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
                            >
                              <span className="material-symbols-outlined text-2xl">arrow_forward</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>

      <div className="fixed bottom-6 left-4 right-4 z-40 pb-safe mx-auto max-w-lg">
        <button
          onClick={finishShopping}
          className="w-full flex items-center justify-center gap-3 bg-text-main text-white rounded-2xl h-14 shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all"
        >
          <span className="text-lg font-bold tracking-wide">Finalizar Compra</span>
          <span className="bg-white/20 px-2 py-0.5 rounded text-sm font-medium">R$ {totalActual.toFixed(2)}</span>
        </button>
      </div>
    </div >
  );
};

export default ShoppingMode;
