import type { Category, Product, ProductDetail } from "./marketplaceTypes";

export const demoCategories: Category[] = [
  { slug: "business", name: "Business", nameRu: "Бизнес", nameUz: "Biznes" },
  { slug: "education", name: "Education", nameRu: "Образование", nameUz: "Ta’lim" },
  { slug: "marketing", name: "Marketing", nameRu: "Маркетинг", nameUz: "Marketing" },
  { slug: "technology", name: "Technology", nameRu: "Технологии", nameUz: "Texnologiya" },
  { slug: "other", name: "Other", nameRu: "Другое", nameUz: "Boshqa" },
];

const examples = [
  ["Investor pitch deck", "A polished, editable startup funding presentation.", "business", "Northstar Studio", 1250000],
  ["Learning roadmap", "A clear curriculum plan for a modern learning program.", "education", "BrightPath", 850000],
  ["Brand launch strategy", "A practical launch plan with campaign milestones.", "marketing", "Mosaic Creative", 990000],
  ["Product analytics", "A concise product metrics and insights deck.", "technology", "Signal Works", 1150000],
  ["Quarterly business review", "An executive-ready review for quarterly results.", "business", "Northstar Studio", 750000],
  ["Classroom workshop", "A friendly workshop deck for interactive learning.", "education", "BrightPath", 650000],
  ["Social campaign planner", "Plan channels, creative, and campaign outcomes.", "marketing", "Mosaic Creative", 720000],
  ["Cloud migration plan", "A technology migration plan with phased delivery.", "technology", "Signal Works", 1350000],
  ["Project proposal", "A reusable structure for planning new initiatives.", "other", "Studio Atlas", 540000],
  ["Market research report", "A clean, data-focused market research story.", "business", "Studio Atlas", 920000],
  ["Training program", "An editable training deck for growing teams.", "education", "BrightPath", 780000],
  ["Customer journey map", "Map customer touchpoints and experience insights.", "marketing", "Mosaic Creative", 890000],
] as const;

export const demoProducts: Product[] = examples.map((example, index) => ({
  listingId: `demo-listing-${index + 1}`,
  listingVersionId: `demo-version-${index + 1}`,
  title: example[0],
  description: example[1],
  sellerId: `demo-seller-${index % 4 + 1}`,
  sellerName: example[3],
  version: 1,
  priceTiyin: example[4],
  currency: "UZS",
  publishedAt: new Date("2026-01-01T00:00:00Z").toISOString(),
  category: example[2],
}));

export const demoProductDetails = new Map<string, ProductDetail>(
  demoProducts.map((product) => [
    product.listingId,
    {
      ...product,
      licenseTerms: "Demo license: editable for your own projects. No resale or redistribution of the source file.",
    },
  ]),
);

export const demoCatalogPage = (page: number, size: number, category: string) => {
  const filtered = category ? demoProducts.filter((product) => product.category === category) : demoProducts;
  return {
    items: filtered.slice(page * size, (page + 1) * size),
    page,
    size,
    total: filtered.length,
  };
};
