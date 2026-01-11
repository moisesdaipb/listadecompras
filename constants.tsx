
import { ShoppingList } from './types';

export const MOCK_LISTS: ShoppingList[] = [
  {
    id: '1',
    title: 'Compras do Mês',
    status: 'active',
    updatedAt: '10m',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200',
    participants: [
      'https://i.pravatar.cc/150?u=marina',
      'https://i.pravatar.cc/150?u=joao'
    ],
    items: Array(42).fill(null).map((_, i) => ({
      id: `item-${i}`,
      name: `Item ${i + 1}`,
      quantity: 1,
      estimatedPrice: 20.23,
      isBought: i < 12,
      category: 'Geral'
    }))
  },
  {
    id: '2',
    title: 'Churrasco Domingo',
    status: 'planned',
    updatedAt: '2h',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=200',
    participants: ['https://i.pravatar.cc/150?u=marina'],
    items: Array(15).fill(null).map((_, i) => ({
      id: `churras-${i}`,
      name: `Carne ${i + 1}`,
      quantity: 2,
      estimatedPrice: 13.33,
      isBought: false,
      category: 'Açougue'
    }))
  },
  {
    id: '3',
    title: 'Farmácia',
    status: 'completed',
    updatedAt: '1d',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=200',
    participants: ['https://i.pravatar.cc/150?u=marina'],
    items: [
      { id: 'f1', name: 'Aspirina', quantity: 1, estimatedPrice: 15.00, actualPrice: 15.00, isBought: true, category: 'Saúde' },
      { id: 'f2', name: 'Alcool', quantity: 2, estimatedPrice: 15.00, actualPrice: 15.00, isBought: true, category: 'Higiene' }
    ]
  }
];

export const CATEGORIES = [
  'Hortifruti',
  'Laticínios & Ovos',
  'Açougue',
  'Limpeza',
  'Higiene',
  'Padaria',
  'Bebidas',
  'Mercearia',
  'Geral'
];

export const PRODUCT_CATALOG: Record<string, string[]> = {
  'Hortifruti': ['Maçã', 'Banana', 'Laranja', 'Tomate', 'Alface', 'Batata', 'Cebola', 'Cenoura', 'Alho', 'Limão', 'Uva', 'Morango'],
  'Laticínios & Ovos': ['Leite Integral', 'Leite Desnatado', 'Ovos', 'Manteiga', 'Queijo Mussarela', 'Queijo Prato', 'Iogurte', 'Requeijão', 'Creme de Leite', 'Leite Condensado'],
  'Açougue': ['Carne Moída', 'Frango (Peito)', 'Frango (Coxa)', 'Bife bovino', 'Carne de Porco', 'Salsicha', 'Linguiça', 'Bacon', 'Presunto'],
  'Padaria': ['Pão Francês', 'Pão de Forma', 'Bolo', 'Torrada', 'Bisnaguinha'],
  'Mercearia': ['Arroz', 'Feijão', 'Macarrão', 'Óleo', 'Azeite', 'Sal', 'Açúcar', 'Café', 'Farinha de Trigo', 'Molho de Tomate', 'Biscoito', 'Pipoca'],
  'Bebidas': ['Água', 'Refrigerante', 'Suco', 'Cerveja', 'Vinho', 'Água de Coco'],
  'Limpeza': ['Detergente', 'Sabão em Pó', 'Amaciante', 'Água Sanitária', 'Desinfetante', 'Esponja', 'Saco de Lixo', 'Papel Higiênico'],
  'Higiene': ['Sabonete', 'Shampoo', 'Condicionador', 'Pasta de Dente', 'Escova de Dente', 'Desodorante']
};
