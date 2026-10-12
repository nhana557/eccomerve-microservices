"use client";

import { useState, useEffect, useMemo } from "react";
import { Category } from "../types";
import { categoryApi } from "../api/category-api";

export function flattenCategories(tree: Category[]): Category[] {
  const result: Category[] = [];
  function traverse(nodes: Category[]) {
    for (const node of nodes) {
      result.push(node);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  traverse(tree);
  return result;
}

export function findCategoryByIdOrSlug(categories: Category[], identifier: string): Category | undefined {
  if (!identifier) return undefined;
  const target = identifier.toLowerCase();
  const flat = flattenCategories(categories);
  return flat.find((c) => c.id === identifier || c.slug?.toLowerCase() === target || c.name.toLowerCase() === target);
}

export function findParentCategory(categories: Category[], childId: string): Category | undefined {
  if (!childId) return undefined;
  for (const parent of categories) {
    if (parent.children && parent.children.some((c) => c.id === childId)) {
      return parent;
    }
  }
  return undefined;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    categoryApi
      .getCategories()
      .then((data) => {
        if (isMounted) {
          setCategories(data || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load categories");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const flatList = useMemo(() => flattenCategories(categories), [categories]);

  return {
    categories,
    flatList,
    isLoading,
    error,
  };
}
