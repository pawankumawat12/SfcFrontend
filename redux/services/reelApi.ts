import { baseApi } from "./baseApi";

export interface ReelItem {
  id: number;
  title: string;
  video_url: string;
  platform: "youtube" | "instagram" | "direct";
  thumbnail_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const reelApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getActiveReels: build.query<ReelItem[], void>({
      query: () => "/reels",
      transformResponse: (res: any) => {
        return Array.isArray(res?.data) ? res.data : [];
      },
      providesTags: ["Reels"],
    }),
  }),
});

export const { useGetActiveReelsQuery } = reelApi;

