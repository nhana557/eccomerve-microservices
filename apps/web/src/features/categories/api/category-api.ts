import { apiRequest } from "../../../lib/api-client";
import { Category } from "../types";

export const categoryApi = {
  getCategories: async (): Promise<Category[]> => {
    const res = await apiRequest<Category[]>("/api/v1/categories");
    return res || [];
  },

  getCategoryByID: async (id: string): Promise<Category> => {
    return apiRequest<Category>(`/api/v1/categories/${id}`);
  },
};
