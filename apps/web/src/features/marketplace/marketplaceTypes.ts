export type Category = {
  slug: string;
  name: string;
  nameRu?: string;
  nameUz?: string;
};

export type PreviewSlide = {
  slideNumber: number;
  title: string;
  text: string[];
  backgroundColor: string;
  accentColor: string;
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
  previewSlides?: PreviewSlide[];
};

export type ProductDetail = Product & { licenseTerms: string };

export type Purchase = {
  entitlementId: string;
  listingId: string;
  listingVersionId: string;
  orderId: string;
  title: string;
  sellerName: string;
  priceTiyin: number;
  currency: string;
  purchasedAt: string;
  previewSlides: PreviewSlide[];
};

export type PurchaseContent = {
  entitlementId: string;
  title: string;
  document: {
    slides?: Array<{
      title?: string;
      backgroundColor?: string;
      accentColor?: string;
      elements?: Array<{ type?: string; text?: string }>;
    }>;
  };
};
