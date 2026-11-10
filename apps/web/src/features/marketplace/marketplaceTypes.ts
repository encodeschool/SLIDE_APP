export type Category = {
  slug: string;
  name: string;
  nameRu?: string;
  nameUz?: string;
};

export type Product = {
  listingId: string;
  listingVersionId: string;
  title: string;
  description: string;
  sellerId: string;
  sellerName: string;
  version: number;
  priceTiyin: number;
  currency: string;
  publishedAt: string;
  category: string;
};

export type ProductDetail = Product & { licenseTerms: string };
