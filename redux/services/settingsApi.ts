import { baseApi } from "./baseApi";

export interface ColorThemeItem {
  id: string;
  name: string;
  color: string;
  desc: string;
  accent?: string;
}

export interface ThemeSettings {
  theme: "light" | "dark";
  colorTheme: string;
  availableColorThemes?: ColorThemeItem[];
}

export interface ThemeSettingsResponse {
  success: boolean;
  message?: string;
  data: ThemeSettings;
}

export interface FooterSettings {
  phone_number: string;
  email: string;
  location: string;
  working_hours: string;
  instagram: string;
  facebook: string;
  twitter: string;
}

export interface FooterSettingsResponse {
  success: boolean;
  message?: string;
  data: FooterSettings;
}

export interface LogoSettings {
  logo_url: string;
}

export interface LogoSettingsResponse {
  success: boolean;
  message?: string;
  data: LogoSettings;
}

export interface StoreStatusSettings {
  is_open: boolean;
  closed_message: string;
}

export interface StoreStatusResponse {
  success: boolean;
  message?: string;
  data: StoreStatusSettings;
}

export interface OrderPricingSettings {
  store_latitude: number;
  store_longitude: number;
  minimum_order_amount?: number;
  free_delivery_threshold?: number;
  max_delivery_distance?: number;
  delivery_charge_type?: string;
  delivery_charge_value?: number;
  packaging_fee?: number;
  platform_fee?: number;
  cod_fee?: number;
  gst_percent?: number;
  tax_inclusive?: boolean;
}

export interface OrderPricingResponse {
  success: boolean;
  message?: string;
  data: OrderPricingSettings;
}

export interface DeveloperSettings {
  is_enabled: boolean;
  developer_name: string;
  developer_email: string;
  developer_phone: string;
  developer_whatsapp: string;
  developer_tagline: string;
  custom_inquiry_message: string;
  show_in_frontend: boolean;
  show_in_store_dashboard: boolean;
}

export interface DeveloperSettingsResponse {
  success: boolean;
  message?: string;
  data: DeveloperSettings;
}

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTheme: build.query<ThemeSettingsResponse, void>({
      query: () => "/settings/theme",
      providesTags: ["Settings"],
    }),
    getFooter: build.query<FooterSettingsResponse, void>({
      query: () => "/settings/footer",
      providesTags: ["Settings"],
    }),
    getLogo: build.query<LogoSettingsResponse, void>({
      query: () => "/settings/logo",
      providesTags: ["Settings"],
    }),
    getStoreStatus: build.query<StoreStatusResponse, void>({
      query: () => "/settings/store-status",
      providesTags: ["Settings"],
    }),
    getOrderPricing: build.query<OrderPricingResponse, void>({
      query: () => "/settings/order-pricing",
      providesTags: ["Settings"],
    }),
    getDeveloperSettings: build.query<DeveloperSettingsResponse, void>({
      query: () => "/settings/developer",
      providesTags: ["Settings"],
    }),
  }),
});

export const {
  useGetThemeQuery,
  useGetFooterQuery,
  useGetLogoQuery,
  useGetStoreStatusQuery,
  useGetOrderPricingQuery,
  useGetDeveloperSettingsQuery,
} = settingsApi;
