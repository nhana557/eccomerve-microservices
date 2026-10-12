export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  category_id?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: string;
  category_id?: string;
  image_url?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  category?: string;
  category_id?: string;
  image_url?: string;
}
