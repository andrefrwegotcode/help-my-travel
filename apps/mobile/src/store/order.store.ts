import { create } from 'zustand';
import type { MenuItem } from '@helpmytravel/shared';

interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
}

interface OrderState {
  items: OrderItem[];
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearOrder: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  items: [],

  addItem: (menuItem) => {
    const items = get().items;
    const existing = items.find((i) => i.menuItem.id === menuItem.id);
    if (existing) {
      set({
        items: items.map((i) =>
          i.menuItem.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      });
    } else {
      set({ items: [...items, { menuItem, quantity: 1 }] });
    }
  },

  removeItem: (itemId) => {
    set({ items: get().items.filter((i) => i.menuItem.id !== itemId) });
  },

  updateQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.menuItem.id === itemId ? { ...i, quantity } : i,
      ),
    });
  },

  clearOrder: () => set({ items: [] }),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  totalPrice: () =>
    get().items.reduce(
      (sum, i) => sum + (i.menuItem.priceValue ?? 0) * i.quantity,
      0,
    ),
}));
