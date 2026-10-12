export interface Category {
  id: string;
  name: string;
  slug: string;
  icon_url?: string;
  parent_id?: string;
  level: number;
  children?: Category[];
  created_at?: string;
  updated_at?: string;
}
