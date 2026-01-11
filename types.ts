
export type ListStatus = 'active' | 'planned' | 'completed';

export interface ListItem {
  id: string;
  name: string;
  quantity: number;
  estimatedPrice: number;
  actualPrice?: number;
  isBought: boolean;
  category: string;
}

export interface ShoppingList {
  id: string;
  title: string;
  status: ListStatus;
  items: ListItem[];
  updatedAt: string;
  image?: string;
  participants: string[]; // Avatar URLs
}

export interface SummaryData {
  totalEstimated: number;
  totalActual: number;
  itemsCount: number;
  itemsBought: number;
  savings: number;
}
