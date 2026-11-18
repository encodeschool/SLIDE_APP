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

export type MarketplaceWorkType =
  | "presentation"
  | "document"
  | "coursework"
  | "worksheet"
  | "design"
  | "other";

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
  workType: MarketplaceWorkType;
  fileFormat: string | null;
  hasDownloadableFile: boolean;
  slideCount: number;
  previewSlides?: PreviewSlide[];
};

export type FilePreviewPage = {
  pageNumber: number;
  imageDataUrl: string;
};

export type FilePreview = {
  totalPages: number;
  pages: FilePreviewPage[];
};

export type ProductDetail = Product & {
  licenseTerms: string;
  filePreview?: FilePreview;
  filePreviewUnavailable?: boolean;
  filePreviewLoading?: boolean;
};

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
  workType: MarketplaceWorkType;
  fileName: string | null;
  fileSize: number;
  hasDownloadableFile: boolean;
  slideCount: number;
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
