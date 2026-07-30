const BASE_URL = 'https://world.openfoodfacts.org';
const TIMEOUT_MS = 10000;
const FIELDS = 'code,product_name,nutriments,product_quantity_unit';

export interface OFFProduct {
  barcode: string;
  name: string;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  unit: 'g' | 'ml';
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function toProduct(p: any): OFFProduct | null {
  const name = p?.product_name?.trim();
  if (!name) return null;
  const n = p?.nutriments ?? {};
  // Open Food Facts always keys nutrients "_100g" even for liquids, but reports the
  // product's actual unit separately — that's what tells us "grams" vs "millilitres".
  const unit: 'g' | 'ml' = p?.product_quantity_unit === 'ml' ? 'ml' : 'g';
  return {
    barcode: String(p.code ?? p._id ?? ''),
    name,
    proteinPer100g: Number(n.proteins_100g ?? 0),
    carbsPer100g: Number(n.carbohydrates_100g ?? 0),
    fatPer100g: Number(n.fat_100g ?? 0),
    unit,
  };
}

export async function fetchProductByBarcode(barcode: string): Promise<OFFProduct | null> {
  const res = await fetchWithTimeout(
    `${BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  return toProduct({ ...data.product, code: data.product.code ?? barcode });
}

export async function searchProducts(query: string): Promise<OFFProduct[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const res = await fetchWithTimeout(
    `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(trimmed)}&search_simple=1&action=process&json=1&page_size=25&fields=${FIELDS}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  const products: OFFProduct[] = [];
  for (const p of data.products ?? []) {
    const product = toProduct(p);
    if (product) products.push(product);
  }
  return products;
}
