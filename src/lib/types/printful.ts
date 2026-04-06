export interface PrintfulCatalogProduct {
  catalog_product_id: number;
  title: string;
  description: string;
  brand: string;
  model: string;
  image: string;
  variant_count: number;
  currency: string;
}

export interface PrintfulCatalogVariant {
  catalog_variant_id: number;
  catalog_product_id: number;
  name: string;
  size: string;
  color: string;
  color_code: string;
  color_code2: string;
  image: string;
  price: string;
  in_stock: boolean;
}

export interface PrintfulMockupStyle {
  placement: string;
  display_name: string;
  technique: string;
  print_area_width: number;
  print_area_height: number;
  print_area_type: string;
  dpi: number;
}

export interface PrintfulMockupTask {
  id: number;
  status: 'pending' | 'completed' | 'failed';
  catalog_variant_mockups: PrintfulMockupVariantResult[];
  failure_reasons: string[];
}

export interface PrintfulMockupVariantResult {
  catalog_variant_id: number;
  mockups: Array<{
    placement: string;
    mockup_url: string;
  }>;
}

export interface PrintfulFile {
  id: string;
  url: string;
  preview_url: string;
  filename: string;
  type?: string;
}

export interface PrintfulOrder {
  id: number;
  status: string;
  recipient: {
    name: string;
    address1: string;
    city: string;
    state_code: string;
    country_code: string;
    zip: string;
    email?: string;
  };
  items: PrintfulOrderItem[];
}

export interface PrintfulOrderItem {
  catalog_variant_id: number;
  quantity: number;
  files: Array<{
    placement: string;
    file_id: string;
  }>;
}

export interface PrintfulWebhookEvent {
  type: string;
  data: any;
}
