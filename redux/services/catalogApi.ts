import { baseApi } from "./baseApi";
import { toAssetUrl } from "../../utils/backendUrl";

type ApiProduct = {
  id: number | string;
  name: string;
  description?: string;
  category_id: number | string;
  category_name?: string;
  price: number | string;
  images?: string[];
  is_active?: boolean;
  offers?: any[];
  [key: string]: unknown;
};

type ApiCategory = {
  id: number | string;
  name: string;
  description?: string;
  image?: string;
  is_active?: boolean;
  [key: string]: unknown;
};

type ApiResponse<T> = { data?: T[];[key: string]: unknown };
type ApiItemResponse<T> = { data: T;[key: string]: unknown };
type StoreProductQuery = {
  categoryId?: string | number;
  isActive?: boolean;
  limit?: number;
  page?: number;
  store_id?: string | number;
  storeId?: string | number;
};


const normalizeProduct = (product: ApiProduct) => {
  const availabilityType = String(product.availability_type || "IN_STOCK").toUpperCase();
  const isMadeToOrder = availabilityType === "MADE_TO_ORDER";
  const rawImageList: string[] = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : (product.img || product.image ? [String(product.img || product.image)] : []);
  const normalizedImages = rawImageList.map((im) => toAssetUrl(im)).filter(Boolean);

  return {
    ...product,
    id: Number(product.id),
    category: String(product.category_id),
    categoryName: product.category_name || "Menu",
    price: Number(product.price),
    // MADE_TO_ORDER products have unlimited stock — never treat as 0
    stock: isMadeToOrder ? Infinity : (product.stock !== undefined ? Number(product.stock) : 1),
    img: normalizedImages[0] || "",
    image: normalizedImages[0] || "",
    images: normalizedImages,
    isActive: Boolean(product.is_active),
    availability_type: availabilityType,
    isMadeToOrder,
    rating: Number(product.rating || 0),
    total_reviews: Number(product.total_reviews || 0),
    offers: Array.isArray(product.offers) ? product.offers : [],
  };
};

const normalizeCategory = (category: ApiCategory) => ({
  ...category,
  id: String(category.id),
  img: toAssetUrl(category.image),
  isActive: Boolean(category.is_active),
});

export const catalogApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStoreProducts: build.query<
      ApiResponse<ReturnType<typeof normalizeProduct>>,
      StoreProductQuery | void
    >({
      query: (params: StoreProductQuery = {}) => {
        const { storeId, store_id, ...rest } = params || {};
        const effectiveStoreId = store_id !== undefined ? store_id : storeId;
        const isBranch =
          effectiveStoreId !== undefined &&
          effectiveStoreId !== null &&
          effectiveStoreId !== "" &&
          effectiveStoreId !== "admin";

        return {
          url: "/products",
          params: {
            limit: 100,
            isActive: true,
            include_admin: !isBranch,
            ...(effectiveStoreId !== undefined ? { store_id: effectiveStoreId } : {}),
            ...rest,
          },
        };
      },
      transformResponse: (response: ApiResponse<ApiProduct>) => ({
        ...response,
        data: (response.data || []).map(normalizeProduct),
      }),
      providesTags: ["Catalog"],
    }),
    getStoreProduct: build.query({
      query: (id) => ({
        url: `/products/${id}`,
      }),
      transformResponse: (response: ApiItemResponse<ApiProduct>) => ({
        ...response,
        data: normalizeProduct(response.data),
      }),
      providesTags: (_result, _error, id) => [{ type: "Catalog", id }],
    }),
    getStoreCategories: build.query({
      query: (params = {}) => ({
        url: "/categories",
        params: { limit: 100, isActive: true, ...params },
      }),
      transformResponse: (response: ApiResponse<ApiCategory>) => ({
        ...response,
        data: (response.data || []).map(normalizeCategory),
      }),
      providesTags: ["Catalog"],
    }),
  }),
});

export const {
  useGetStoreProductsQuery,
  useGetStoreProductQuery,
  useGetStoreCategoriesQuery,
} = catalogApi;

export { normalizeProduct };
