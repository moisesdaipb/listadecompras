import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { supabase } from '../lib/supabase';

const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [categoryData, setCategoryData] = useState<any[]>([]);



  const [filter, setFilter] = useState<'all' | '30d' | '90d' | '1y' | 'custom'>('all');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Re-fetch when filters change (or simpler: fetch all once and filter in memory? 
  // Given current architecture fetches all, let's filter after fetch or re-trigger fetch.
  // Ideally, re-trigger fetchAnalytics is safer if we move logic to backend later, 
  // but for consistency with History, let's just trigger fetchAnalytics and handle filtering inside it 
  // OR better: use useMemo/useEffect.
  // But since fetchAnalytics sets state directly, let's call it on filter change.

  useEffect(() => {
    fetchAnalytics();
  }, [filter, startDate, endDate]);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all items from completed lists
      // We can join items via lists
      const { data: listsData, error } = await supabase
        .from('lists')
        .select(`
            id,
            updated_at,
            items (
                actual_price,
                estimated_price,
                is_bought,
                category
            )
        `)
        .eq('owner_id', user.id)
        .eq('status', 'completed');

      if (error) throw error;

      let spent = 0;
      const categories: { [key: string]: { value: number, items: number, color: string } } = {};

      if (listsData) {

        // Filter Logic
        const filteredLists = listsData.filter(list => {
          if (filter === 'all') return true;
          const listDate = new Date(list.updated_at);
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
            let end = new Date();
            if (endDate) {
              end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
            }
            return listDate >= start && listDate <= end;
          }
          return true;
        });

        filteredLists.forEach(list => {
          list.items.forEach((item: any) => {
            if (item.is_bought) {
              const price = Number(item.actual_price) || Number(item.estimated_price) || 0;
              spent += price;

              const cat = item.category || 'Geral';
              if (!categories[cat]) {
                categories[cat] = { value: 0, items: 0, color: getColorForCategory(cat) };
              }
              categories[cat].value += price;
              categories[cat].items += 1;
            }
          });
        });
      }

      setTotalSpent(spent);

      const catArray = Object.keys(categories).map(key => ({
        name: key,
        ...categories[key]
      })).sort((a, b) => b.value - a.value);

      setCategoryData(catArray);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getColorForCategory = (cat: string) => {
    const colors: { [key: string]: string } = {
      'Alimentos': '#2E7D32',
      'Limpeza': '#4CAF50',
      'Higiene': '#81C784',
      'Açougue': '#e53935',
      'Bebidas': '#FFB300',
      'Geral': '#9E9E9E'
    };
    return colors[cat] || '#C8E6C9';
  };

  const DATA_MONTHLY = [
    { name: 'Semana 1', total: totalSpent * 0.2 }, // Mock distribution for now
    { name: 'Semana 2', total: totalSpent * 0.3 },
    { name: 'Semana 3', total: totalSpent * 0.1 },
    { name: 'Semana 4', total: totalSpent * 0.4 },
  ];

  if (loading) return <div className="p-10 text-center">Calculando análises...</div>;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-white/95 dark:bg-surface-dark/95 backdrop-blur-md px-5 py-3 border-b border-divider">
        <div className="w-10"></div>
        <h2 className="text-lg font-bold">Análises</h2>
        <div className="w-10"></div>

      </header>

      <div className="px-5 py-2 flex gap-2 overflow-x-auto no-scrollbar border-b border-divider bg-white dark:bg-surface-dark/50">
        <button onClick={() => { setFilter('all'); setShowCustomDate(false); }} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>Todos</button>
        <button onClick={() => { setFilter('30d'); setShowCustomDate(false); }} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === '30d' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>30 dias</button>
        <button onClick={() => { setFilter('90d'); setShowCustomDate(false); }} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === '90d' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>90 dias</button>
        <button onClick={() => { setFilter('1y'); setShowCustomDate(false); }} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filter === '1y' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>1 ano</button>
        <button onClick={() => { setFilter('custom'); setShowCustomDate(!showCustomDate); }} className={`size-7 flex items-center justify-center rounded-full transition-colors ${filter === 'custom' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
          <span className="material-symbols-outlined text-[16px]">calendar_month</span>
        </button>
      </div>

      {showCustomDate && (
        <div className="px-5 py-3 bg-gray-50 dark:bg-surface-dark border-b border-divider animate-in slide-in-from-top-2">
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

      <main className="flex flex-col gap-6 px-5 pb-24">
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white dark:bg-surface-dark p-5 rounded-2xl shadow-sm border border-divider flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Gasto</p>
                <p className="text-3xl font-black mt-1">R$ {totalSpent.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400">Baseado em listas concluídas</p>
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-bold mb-4">Evolução Mensal (Estimada)</h2>
          <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-divider">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={DATA_MONTHLY}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2E7D32" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickFormatter={(value) => `R$${value}`}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#2E7D32', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#2E7D32" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Por Categoria</h2>
            <button className="text-primary text-sm font-bold">Ver tudo</button>
          </div>
          <div className="flex flex-col gap-3">
            {categoryData.length > 0 ? (
              <div className="h-[400px] w-full font-sans">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={categoryData}
                    margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={80}
                      tick={{ fontSize: 11, fontWeight: 600, fill: '#666' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Gasto']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24} background={{ fill: '#f5f5f5', radius: [0, 4, 4, 0] }}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-center text-gray-500 py-4">Nenhum dado por categoria disponível.</p>}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Analytics;
