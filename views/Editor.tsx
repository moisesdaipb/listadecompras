import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShoppingList, ListItem } from '../types';
import { PRODUCT_CATALOG, CATEGORIES } from '../constants';

const Editor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [showCatalog, setShowCatalog] = useState(false);
  const [selectedCatalogItems, setSelectedCatalogItems] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [list, setList] = useState<Partial<ShoppingList>>({
    title: '',
    items: [],
    status: 'planned'
  });

  useEffect(() => {
    if (id) {
      fetchList(id);
    }
  }, [id]);

  const fetchList = async (listId: string) => {
    setLoading(true);
    const { data: listData, error } = await supabase
      .from('lists')
      .select('*, items(*)')
      .eq('id', listId)
      .single();

    if (error) {
      console.error('Error fetching list:', error);
    } else if (listData) {
      // Map DB items to frontend items
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
        items: items, // Using mapped items
        updatedAt: listData.updated_at
      });
    }
    setLoading(false);
  };

  const addItem = () => {
    const newItem: ListItem = {
      id: `temp-${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      quantity: 1,
      estimatedPrice: 0,
      isBought: false,
      category: 'Geral'
    };
    setList(prev => ({ ...prev, items: [newItem, ...(prev.items || [])] }));
    setHasUnsavedChanges(true);
  };

  const updateItem = (itemId: string, field: keyof ListItem, value: any) => {
    setList(prev => ({
      ...prev,
      items: prev.items?.map(item => item.id === itemId ? { ...item, [field]: value } : item)
    }));
    setHasUnsavedChanges(true);
  };

  const removeItem = async (itemId: string) => {
    // If it's real item (not temp), delete from DB immediately or mark for deletion?
    // For simplicity, we delete from state. Real deletion happens on save or immediately?
    // A better UX is often to delete immediately if confirmed, or just remove from UI and sync on save.
    // Given the simple 'Save' button architecture, let's remove from UI and handle deletion on Save 
    // OR just delete from DB if it exists.
    // Let's go with: Remove from UI. On save, we replace all items or handle diffs.
    // Simpler approach for this scope: Delete from DB if not temp.

    if (!itemId.startsWith('temp-')) {
      const { error } = await supabase.from('items').delete().eq('id', itemId);
      if (error) {
        console.error('Error deleting item', error);
        alert('Erro ao deletar item.');
        return;
      }
    }

    setList(prev => ({
      ...prev,
      items: prev.items?.filter(item => item.id !== itemId)
    }));
    setHasUnsavedChanges(true);
  };

  const toggleCatalogItem = (item: string) => {
    setSelectedCatalogItems(prev => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  };

  const addCatalogItems = () => {
    const newItems: ListItem[] = Array.from(selectedCatalogItems).map((itemName: string) => {
      // Find category
      let category = 'Geral';
      for (const [cat, items] of Object.entries(PRODUCT_CATALOG)) {
        if (items.includes(itemName)) {
          category = cat;
          break;
        }
      }

      return {
        id: `temp-${Math.random().toString(36).substr(2, 9)}`,
        name: itemName,
        quantity: 1,
        estimatedPrice: 0,
        isBought: false,
        category: category
      };
    });

    setList(prev => ({ ...prev, items: [...newItems, ...(prev.items || [])] }));
    setSelectedCatalogItems(new Set());
    setShowCatalog(false);
    setHasUnsavedChanges(true);
  };

  const saveList = async (targetStatus?: 'active' | 'planned' | 'completed', redirectPath: string = '/home') => {
    if (!list.title) {
      alert('Por favor, dê um nome à lista.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let listId = list.id;
      const finalStatus = targetStatus || list.status || 'planned';

      // 1. Upsert List
      const { data: savedList, error: listError } = await supabase
        .from('lists')
        .upsert({
          id: list.id,
          title: list.title,
          owner_id: user.id,
          status: finalStatus,
          updated_at: new Date()
        })
        .select()
        .single();

      if (listError) throw listError;
      listId = savedList.id;

      // 2. Handle Items
      if (list.items && list.items.length > 0) {
        // Prepare items common data
        const mapItem = (i: ListItem) => ({
          list_id: listId,
          name: i.name || 'Item sem nome',
          quantity: i.quantity,
          category: i.category,
          estimated_price: i.estimatedPrice,
          is_bought: i.isBought,
          actual_price: i.actualPrice
        });

        const toInsert = list.items
          .filter(i => i.id.startsWith('temp-'))
          .map(i => mapItem(i));

        const toUpdate = list.items
          .filter(i => !i.id.startsWith('temp-'))
          .map(i => ({ ...mapItem(i), id: i.id }));

        if (toInsert.length > 0) {
          const { error } = await supabase.from('items').insert(toInsert);
          if (error) throw error;
        }

        if (toUpdate.length > 0) {
          const { error } = await supabase.from('items').upsert(toUpdate);
          if (error) throw error;
        }
      }



      setHasUnsavedChanges(false); // Reset unsaved changes flag
      navigate(redirectPath === '/shopping' ? `/shopping/${listId}` : redirectPath);

    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteList = async () => {
    if (!id) return;
    if (!window.confirm('Tem certeza que deseja excluir esta lista? Esta ação não pode ser desfeita.')) return;

    setLoading(true);
    try {
      // Delete items first (optional if cascade is set, but safer)
      // RLS should allow deleting items if list matches.
      // Actually, if we delete list, Postgres ON DELETE CASCADE should handle items if configured.
      // Let's check if we configured CASCADE. If not, we must delete items manually.
      // Given the schema setup, we likely have foreign keys. 
      // Safest to just delete list and let DB handle or error.

      const { error } = await supabase.from('lists').delete().eq('id', id);
      if (error) throw error;

      navigate('/home');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao excluir lista: ' + err.message);
      setLoading(false);
    }
  };

  const totalEstimated = list.items?.reduce((acc, i) => acc + (i.estimatedPrice * i.quantity), 0) || 0;

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('Você tem alterações não salvas. Deseja realmente sair e perder o progresso?')) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  if (loading && !list.id && id) return <div className="p-10 text-center">Carregando editor...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-surface-dark sticky top-0 z-30 shadow-sm">
        <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight">{id ? 'Editar Lista' : 'Nova Lista'}</h1>
        <div className="flex items-center gap-2">
          {id && (
            <button
              onClick={deleteList}
              disabled={loading}
              className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
              title="Excluir Lista"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          )}
          <button
            onClick={() => saveList('planned', '/home')}
            disabled={loading}
            className="text-primary hover:text-primary-dark font-bold text-base transition-colors px-2 py-1 rounded-lg hover:bg-primary/10 disabled:opacity-50"
          >
            {loading ? '...' : 'Salvar'}
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 pb-32">
        <section className="flex flex-col gap-2 mb-8">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Nome da Lista</label>
          <div className="relative">
            <input
              className="w-full bg-surface-light dark:bg-surface-dark border-0 ring-1 ring-divider dark:ring-gray-700 rounded-xl p-4 text-lg font-medium focus:ring-2 focus:ring-primary shadow-sm"
              placeholder="Ex: Compras da Semana"
              value={list.title}
              onChange={(e) => {
                setList(prev => ({ ...prev, title: e.target.value }));
                setHasUnsavedChanges(true);
              }}
            />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold">Itens</h2>
            <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
              {list.items?.length || 0} itens
            </span>
          </div>

          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setShowCatalog(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all font-semibold text-sm active:scale-95"
            >
              <span className="material-symbols-outlined">menu_book</span>
              Catálogo
            </button>
            <button
              onClick={addItem}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary text-primary hover:bg-primary/5 transition-all font-semibold text-sm active:scale-95"
            >
              <span className="material-symbols-outlined">add</span>
              Item Manual
            </button>
          </div>

          {list.items?.map((item) => (
            <div key={item.id} className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm ring-1 ring-divider dark:ring-gray-700 p-4 transition-all">
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Nome do Item</label>
                    <input
                      className="w-full bg-transparent border-0 border-b border-divider p-0 pb-1 text-base font-medium focus:ring-0 focus:border-primary"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                      placeholder="Digite o nome..."
                    />
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
                <div className="flex gap-4">
                  <div className="w-1/3">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Categoria</label>
                    <select
                      className="w-full bg-background-light dark:bg-background-dark border-0 rounded-lg py-2 px-3 text-sm font-medium focus:ring-1 focus:ring-primary appearance-none"
                      value={item.category || 'Geral'}
                      onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-1/4">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Qtd</label>
                    <input
                      type="number"
                      className="w-full bg-background-light dark:bg-background-dark border-0 rounded-lg py-2 px-3 text-sm font-medium focus:ring-1 focus:ring-primary"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Valor Est. (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-background-light dark:bg-background-dark border-0 rounded-lg py-2 pl-9 pr-3 text-sm font-medium focus:ring-1 focus:ring-primary text-right"
                        value={item.estimatedPrice}
                        onChange={(e) => updateItem(item.id, 'estimatedPrice', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}


        </section>
      </main>

      {/* Catalog Modal */}
      {showCatalog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-background-light dark:bg-background-dark w-full max-w-lg h-[85vh] sm:h-[80vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between p-4 border-b border-divider dark:border-gray-700">
              <h2 className="text-lg font-bold">Catálogo de Produtos</h2>
              <button
                onClick={() => setShowCatalog(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-6">
                {Object.entries(PRODUCT_CATALOG).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 sticky top-0 bg-background-light dark:bg-background-dark py-2 z-10">
                      {category}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {items.map(item => {
                        const isSelected = selectedCatalogItems.has(item);
                        return (
                          <button
                            key={item}
                            onClick={() => toggleCatalogItem(item)}
                            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-95 ${isSelected
                              ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                              : 'bg-white dark:bg-surface-dark border-divider dark:border-gray-700 text-text-main dark:text-gray-300 hover:border-primary'
                              }`}
                          >
                            {isSelected && <span className="material-symbols-outlined text-[16px] mr-1 align-text-bottom">check</span>}
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-divider dark:border-gray-700 bg-surface-light dark:bg-surface-dark">
              <button
                onClick={addCatalogItems}
                disabled={selectedCatalogItems.size === 0}
                className="w-full bg-primary disabled:bg-gray-300 disabled:dark:bg-gray-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Adicionar {selectedCatalogItems.size} itens</span>
                <span className="material-symbols-outlined">add_circle</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-md border-t border-divider p-4 pb-8 z-30">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Estimado</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold">R$</span>
              <span className="text-2xl font-bold tracking-tight">{totalEstimated.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => saveList('active', '/shopping')}
              disabled={loading}
              className="bg-primary hover:bg-primary-dark text-white font-bold px-4 py-3 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-75 disabled:active:scale-100"
            >
              <span className="material-symbols-outlined">shopping_cart</span>
              <span>Iniciar Agora</span>
            </button>
            <button
              onClick={() => saveList('planned', '/home')}
              disabled={loading}
              className="bg-gray-100 dark:bg-gray-800 text-text-main dark:text-white font-bold px-4 py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-75"
            >
              <span className="material-symbols-outlined">event_note</span>
              <span>Planejar</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default Editor;
