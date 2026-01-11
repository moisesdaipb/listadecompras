import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShoppingList, ListItem } from '../types';

const Summary: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchList(id);
  }, [id]);

  const fetchList = async (listId: string) => {
    try {
      const { data: listData, error } = await supabase
        .from('lists')
        .select('*, items(*)')
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
          image: listData.image // Preserve image if exists
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Carregando resumo...</div>;
  if (!list) return <div className="p-10 text-center">Lista não encontrada.</div>;

  const totalEstimated = list.items.reduce((acc, i) => acc + (i.estimatedPrice * i.quantity), 0);
  const totalActual = list.items.filter(i => i.isBought).reduce((acc, i) => acc + (i.actualPrice || i.estimatedPrice), 0);
  const savings = totalEstimated - totalActual;
  const boughtCount = list.items.filter(i => i.isBought).length;

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-white/90 dark:bg-surface-dark/90 px-4 py-3 backdrop-blur-md border-b border-divider">
        <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center rounded-full hover:bg-gray-200 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold">Resumo da Compra</h2>
        <div className="size-10"></div>
      </header>

      <main className="flex flex-col gap-6 px-4 py-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span className="material-symbols-outlined text-[16px] font-bold">check_circle</span>
            Lista Concluída
          </span>
          <h1 className="text-4xl font-black tracking-tight text-text-main dark:text-white">
            R$ {totalActual.toFixed(2)}
          </h1>
          <p className="text-sm font-medium text-gray-500">Total pago no caixa</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2 rounded-2xl border border-divider bg-white dark:bg-surface-dark p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-400 text-lg">calculate</span>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Estimado</p>
            </div>
            <p className="text-xl font-bold">R$ {totalEstimated.toFixed(2)}</p>
            <div className="h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full">
              <div className="h-full w-full bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>
          </div>
          <div className={`flex flex-col gap-2 rounded-2xl border p-4 shadow-sm ${savings >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'}`}>
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-lg ${savings >= 0 ? 'text-primary' : 'text-red-500'}`}>savings</span>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${savings >= 0 ? 'text-primary' : 'text-red-500'}`}>
                {savings >= 0 ? 'Economia' : 'Excedido'}
              </p>
            </div>
            <p className={`text-xl font-bold ${savings >= 0 ? 'text-primary' : 'text-red-500'}`}>
              {savings >= 0 ? '' : '+ '}R$ {Math.abs(savings).toFixed(2)}
            </p>
            <div className={`h-1 w-full rounded-full ${savings >= 0 ? 'bg-primary/20' : 'bg-red-500/20'}`}>
              <div
                className={`h-full rounded-full ${savings >= 0 ? 'bg-primary' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, (Math.abs(savings) / totalEstimated) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold text-gray-600 dark:text-gray-400">Desempenho da Sessão</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-3 rounded-xl border border-divider bg-white dark:bg-surface-dark p-4 shadow-sm">
              <span className="material-symbols-outlined text-gray-400">shopping_cart</span>
              <div>
                <p className="text-xl font-bold">{list.items.length}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Totais</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-divider bg-white dark:bg-surface-dark p-4 shadow-sm">
              <span className="material-symbols-outlined text-primary">check</span>
              <div>
                <p className="text-xl font-bold">{boughtCount}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Comprados</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-divider bg-white dark:bg-surface-dark p-4 shadow-sm">
              <span className="material-symbols-outlined text-red-500">close</span>
              <div>
                <p className="text-xl font-bold">{list.items.length - boughtCount}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Faltando</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="w-full mt-auto rounded-xl bg-primary px-6 py-4 text-base font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">check_circle</span>
          Concluir e Voltar
        </button>
      </main>
    </div>
  );
};

export default Summary;
