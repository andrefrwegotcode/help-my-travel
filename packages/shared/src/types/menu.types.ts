export type MenuSource = 'WEBSITE' | 'GOOGLE' | 'OTHER';

export type MenuJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface MenuItem {
  id: string;
  name: string;
  nameOriginal: string;
  description: string | null;
  descriptionOriginal: string | null;
  ingredients: string | null;
  price: string | null;
  priceValue: number | null;
  currency: string | null;
  category: string | null;
  imageUrl: string | null;
}

export interface MenuCategory {
  name: string;
  items: MenuItem[];
}

export interface Menu {
  placeId: string;
  language: string;
  categories: MenuCategory[];
  source: MenuSource;
  sourceUrl: string | null;
  fetchedAt: string;
  expiresAt: string;
}

export interface MenuJobResponse {
  jobId: string;
  status: MenuJobStatus;
  menu?: Menu;
  error?: string;
}

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface OrderRequest {
  placeId: string;
  placeName: string;
  placeLanguage: string;
  items: OrderItem[];
  tableNumber?: string;
  notes?: string;
}

export interface OrderResponse {
  orderText: string;
  items: Array<{
    name: string;
    quantity: number;
    price: string | null;
    subtotal: string | null;
  }>;
  total: string | null;
}
