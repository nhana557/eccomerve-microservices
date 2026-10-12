import React from "react";

export const DEFAULT_CATEGORY_FALLBACK = "/images/default-category.svg";

export const DEFAULT_CATEGORY_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><rect width="100" height="100" rx="20" fill="#1C2026"/><rect x="22" y="22" width="24" height="24" rx="6" fill="#00AA5B"/><rect x="54" y="22" width="24" height="24" rx="6" fill="#00AA5B" opacity="0.6"/><rect x="22" y="54" width="24" height="24" rx="6" fill="#00AA5B" opacity="0.6"/><rect x="54" y="54" width="24" height="24" rx="6" fill="#00AA5B" opacity="0.3"/></svg>`
)}`;

/**
 * Fallback event handler when category image/icon fails to load in browser
 */
export function handleCategoryImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.currentTarget;
  if (!target.dataset.fallbackTried) {
    target.dataset.fallbackTried = "true";
    target.src = DEFAULT_CATEGORY_FALLBACK;
  } else if (!target.dataset.dataUrlTried) {
    target.dataset.dataUrlTried = "true";
    target.src = DEFAULT_CATEGORY_DATA_URL;
  }
}
