/** Public JSON shape of a ServiceCategory (works with lean and hydrated docs). */
export function toCategoryDTO(doc, extra = {}) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? "",
    pricingMode: doc.pricingMode ?? "REQUEST_QUOTE",
    icon: doc.icon ?? "wrench",
    isActive: doc.isActive !== false,
    sortOrder: doc.sortOrder ?? 0,
    deactivatedAt: doc.deactivatedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...extra,
  };
}

/** Default listing order everywhere: admin-defined sortOrder, then name. */
export const CATEGORY_SORT = { sortOrder: 1, name: 1 };
