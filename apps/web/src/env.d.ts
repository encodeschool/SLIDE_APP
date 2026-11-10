interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_MARKETPLACE_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}