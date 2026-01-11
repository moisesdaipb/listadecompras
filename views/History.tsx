import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShoppingList, ListItem } from '../types';

const History: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);


  const [filter, setFilter] = useState<'all' | '30d' | '90d' | '1y' | 'custom'>('all');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const getFilteredHistory = () => {
    return history.filter(list => {
      if (filter === 'all') return true;

      const listDate = new Date(list.updatedAt);
      const now = new Date();

      if (filter === '30d') {
        const past = new Date();
        past.setDate(now.getDate() - 30);
        return listDate >= past;
      }
      if (filter === '90d') {
        const past = new Date();
        past.setDate(now.getDate() - 90);
        return listDate >= past;
      }
      if (filter === '1y') {
        const past = new Date();
        past.setFullYear(now.getFullYear() - 1);
        return listDate >= past;
      }
      if (filter === 'custom') {
        if (!startDate) return true;
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        let end = new Date(); // default to now if not set
        if (endDate) {
          end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
        }

        return listDate >= start && listDate <= end;
      }
      return true;
    });
  };

  const filteredHistory = getFilteredHistory();
  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: listsData, error } = await supabase
        .from('lists')
        .select('*, items(*)')
        .eq('owner_id', user.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching history:', error);
      } else if (listsData) {
        const formattedLists: ShoppingList[] = listsData.map((l: any) => ({
          id: l.id,
          title: l.title,
          status: l.status,
          updatedAt: l.updated_at, // Keep as ISO string for filtering
          image: l.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000',
          participants: [],
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
        setHistory(formattedLists);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReuse = async (e: React.MouseEvent, oldList: ShoppingList) => {
    e.stopPropagation();
    if (!window.confirm(`Criar uma nova lista baseada em "${oldList.title}"?`)) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Create new List
      const { data: newList, error: listError } = await supabase.from('lists').insert({
        title: oldList.title,
        owner_id: user.id,
        status: 'planned',
        created_at: new Date(),
        updated_at: new Date()
      }).select().single();

      if (listError) throw listError;

      // 2. Insert Items
      const newItems = oldList.items.map(i => ({
        list_id: newList.id,
        name: i.name,
        quantity: i.quantity,
        category: i.category,
        estimated_price: i.estimatedPrice,
        is_bought: false,
        actual_price: null
      }));

      if (newItems.length > 0) {
        const { error: itemsError } = await supabase.from('items').insert(newItems);
        if (itemsError) throw itemsError;
      }

      navigate(`/editor/${newList.id}`);

    } catch (err: any) {
      alert('Erro ao duplicar lista: ' + err.message);
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, listId: string) => {
    e.stopPropagation();
    if (!window.confirm('Excluir esta lista do histórico permanentemente?')) return;

    try {
      const { error } = await supabase.from('lists').delete().eq('id', listId);
      if (error) throw error;
      setHistory(prev => prev.filter(l => l.id !== listId));
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  if (loading) return <div className="p-10 text-center">Carregando histórico...</div>;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-30 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md px-4 py-3 border-b border-divider flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full hover:bg-gray-200">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold">Histórico</h1>
        <div className="w-10"></div>
      </header>

      <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-b border-divider bg-white dark:bg-surface-dark/50">
        <button onClick={() => { setFilter('all'); setShowCustomDate(false); }} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>Todos</button>
        <button onClick={() => { setFilter('30d'); setShowCustomDate(false); }} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === '30d' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>30 dias</button>
        <button onClick={() => { setFilter('90d'); setShowCustomDate(false); }} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === '90d' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>90 dias</button>
        <button onClick={() => { setFilter('1y'); setShowCustomDate(false); }} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === '1y' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>1 ano</button>
        <button onClick={() => { setFilter('custom'); setShowCustomDate(!showCustomDate); }} className={`size-7 flex items-center justify-center rounded-full transition-colors ${filter === 'custom' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
          <span className="material-symbols-outlined text-[16px]">calendar_month</span>
        </button>
      </div>

      {showCustomDate && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-surface-dark border-b border-divider animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">De</label>
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setFilter('custom'); }}
                className="w-full bg-white dark:bg-gray-800 border-0 rounded-lg text-sm p-2 shadow-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Até</label>
              <input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setFilter('custom'); }}
                className="w-full bg-white dark:bg-gray-800 border-0 rounded-lg text-sm p-2 shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      <main className="p-4 flex flex-col gap-4">
        {filteredHistory.length > 0 ? (
          filteredHistory.map(list => (
            <div
              key={list.id}
              onClick={() => navigate(`/summary/${list.id}`)}
              className="bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-divider flex flex-col gap-4 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={list.image} className="size-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base leading-tight">{list.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Finalizado em {new Date(list.updatedAt).toLocaleDateString()}</p>
                </div>
                <span className="material-symbols-outlined text-gray-400">chevron_right</span>
              </div>
              <div className="h-px w-full bg-divider"></div>
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Total Pago</span>
                  <span className="text-xl font-bold text-primary">R$ {list.items.reduce((acc, i) => acc + (i.actualPrice || (i.isBought ? i.estimatedPrice : 0)), 0).toFixed(2)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Estimado</span>
                  <span className="text-sm font-semibold text-gray-400 line-through">R$ {list.items.reduce((acc, i) => acc + (i.estimatedPrice), 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-2 pt-3 border-t border-divider">
                <button
                  onClick={(e) => handleDelete(e, list.id)}
                  className="flex-1 py-3 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Excluir
                </button>
                <div className="w-px bg-divider my-1"></div>
                <button
                  onClick={(e) => handleReuse(e, list)}
                  className="flex-1 py-3 rounded-lg text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                  Usar Novamente
                </button>
              </div>

            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
            <span className="material-symbols-outlined text-6xl mb-4">history</span>
            <p className="font-medium">Nenhum histórico encontrado.</p>
          </div>
        )}
      </main >
    </div >
  );
};

export default History;
