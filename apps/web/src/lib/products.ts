/**
 * Canonical Mercato consumer basket.
 *
 * 33 everyday goods grouped by category, modelled on the OECD CPI
 * structure (food, transport, housing, utilities, lifestyle). Each
 * product has a stable, machine-friendly `slug` that uniquely
 * identifies it across countries and gets hashed to bytes12 by
 * `productSlugToBarcode` in lib/encode.ts.
 *
 * Why a fixed canonical list:
 *   1. Aggregation needs identity, a "milk_1l" price in Argentina is
 *      directly comparable to "milk_1l" in Kenya. Free-form text
 *      submissions ("milko", "1 litre milk", "молоко") break that.
 *   2. The submit form's dropdown turns a wide-open problem (any
 *      product) into a single tap, which is a 10x UX win on mobile.
 *   3. A bounded list keeps the country dashboard meaningful, 33
 *      data points per country fit one screen and feel comprehensive,
 *      whereas 5 000 SKUs feel like noise.
 *
 * Edits to this list ARE breaking: submissions sent against the old
 * slug ("bread_500g") will not aggregate with the new one
 * ("bread_loaf_500g") even if they mean the same product. Treat as
 * append-only post-launch, deprecate by adding a successor slug, not
 * renaming.
 *
 * Display labels live in the i18n namespace `products.<slug>.label`
 * and `products.<slug>.hint`, plus `products.categories.<category>`
 * for the grouped dropdown headers. `hasHint` signals which products
 * have a hint key, so consumers can render conditionally without
 * tripping `MISSING_MESSAGE` on the optional second line.
 */

export type ProductCategory =
  | "food"
  | "beverages"
  | "transport"
  | "utilities"
  | "lifestyle"
  | "clothing"
  | "housing";

export interface Product {
  /** Stable identifier, hashed to bytes12 for on-chain submission. */
  slug: string;
  category: ProductCategory;
  /** Whether `products.<slug>.hint` exists in the i18n bundle. */
  hasHint: boolean;
}

export const PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  "food",
  "beverages",
  "transport",
  "utilities",
  "lifestyle",
  "clothing",
  "housing",
];

/**
 * The canonical 33. Order inside each category is from "most
 * universal" (bread, milk) to "more specific" (cheese, olive oil)
 * so the dropdown surfaces the highest-signal items first.
 */
export const PRODUCTS: readonly Product[] = [
  // FOOD (14)
  { slug: "bread_500g", category: "food", hasHint: true },
  { slug: "milk_1l", category: "food", hasHint: true },
  { slug: "eggs_12", category: "food", hasHint: true },
  { slug: "butter_200g", category: "food", hasHint: true },
  { slug: "rice_1kg", category: "food", hasHint: true },
  { slug: "chicken_breast_1kg", category: "food", hasHint: true },
  { slug: "beef_ground_1kg", category: "food", hasHint: true },
  { slug: "apples_1kg", category: "food", hasHint: true },
  { slug: "bananas_1kg", category: "food", hasHint: true },
  { slug: "tomatoes_1kg", category: "food", hasHint: true },
  { slug: "potatoes_1kg", category: "food", hasHint: true },
  { slug: "cheese_local_500g", category: "food", hasHint: true },
  { slug: "olive_oil_1l", category: "food", hasHint: true },
  { slug: "water_bottled_1500ml", category: "food", hasHint: true },

  // BEVERAGES (2)
  { slug: "coffee_cappuccino_cafe", category: "beverages", hasHint: true },
  { slug: "beer_imported_500ml", category: "beverages", hasHint: true },

  // TRANSPORT (4)
  { slug: "gasoline_95_1l", category: "transport", hasHint: true },
  { slug: "diesel_1l", category: "transport", hasHint: true },
  { slug: "public_transport_oneway", category: "transport", hasHint: true },
  { slug: "taxi_5km", category: "transport", hasHint: true },

  // UTILITIES (4)
  { slug: "internet_60mbps_monthly", category: "utilities", hasHint: true },
  { slug: "mobile_10gb_monthly", category: "utilities", hasHint: true },
  { slug: "electricity_apartment_monthly", category: "utilities", hasHint: true },
  { slug: "gas_apartment_monthly", category: "utilities", hasHint: true },

  // LIFESTYLE (5)
  { slug: "meal_inexpensive_restaurant", category: "lifestyle", hasHint: true },
  { slug: "meal_midrange_restaurant", category: "lifestyle", hasHint: true },
  { slug: "gym_monthly_pass", category: "lifestyle", hasHint: true },
  { slug: "cinema_ticket", category: "lifestyle", hasHint: true },
  { slug: "haircut_basic", category: "lifestyle", hasHint: true },

  // CLOTHING (2)
  { slug: "jeans_branded_pair", category: "clothing", hasHint: true },
  { slug: "sneakers_branded_pair", category: "clothing", hasHint: true },

  // HOUSING (3)
  { slug: "rent_1bd_center", category: "housing", hasHint: true },
  { slug: "rent_1bd_outside", category: "housing", hasHint: true },
  { slug: "rent_3bd_center", category: "housing", hasHint: true },
];

/**
 * Lookup by slug, used to resolve a submission's bytes12 productId
 * back to its canonical product entry on the dashboard.
 */
const PRODUCT_BY_SLUG: ReadonlyMap<string, Product> = new Map(
  PRODUCTS.map((p) => [p.slug, p]),
);

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCT_BY_SLUG.get(slug);
}

/**
 * Grouped view for the submit form's `<select>` with `<optgroup>`s.
 * Consumers translate `category` via `products.categories.<category>`
 * and each product's label via `products.<slug>.label`.
 */
export function getProductsByCategory(): Array<{
  category: ProductCategory;
  products: Product[];
}> {
  return PRODUCT_CATEGORIES.map((category) => ({
    category,
    products: PRODUCTS.filter((p) => p.category === category),
  }));
}
