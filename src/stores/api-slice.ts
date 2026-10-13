import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { supabase } from "../lib/supabase";
import type { Profile, StylistStudio } from "../types/profile";

export const api = createApi({
  reducerPath: "api",
  baseQuery: fakeBaseQuery<Error>(),
  endpoints: (build) => ({
    getProfile: build.query<Profile, string>({
      queryFn: async (userId) => {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, phone, marketing_opt_in")
          .eq("id", userId)
          .single();

        if (error) return { error };

        return {
          data: {
            first: data.first_name ?? "",
            last: data.last_name ?? "",
            mobile: data.phone ?? "",
            marketing: data.marketing_opt_in,
          },
        };
      },
    }),
    getStylistStudio: build.query<StylistStudio, string>({
      queryFn: async (userId) => {
        const { data, error } = await supabase
          .from("stylists")
          .select(
            "business_name, business_type, area_label, travel_radius_miles, contact_email, contact_phone, stylist_private(line1, line2, city, postcode), stylist_categories(id, name, sort, colour), services(id, name, description, service_group_id, service_type_id, category_id, duration_min, price_pence, sort)",
          )
          .eq("owner_id", userId)
          .single();

        if (error) return { error };

        return {
          data: {
            businessName: data.business_name,
            businessType: data.business_type,
            areaLabel: data.area_label,
            travelRadiusMiles: data.travel_radius_miles,
            contactEmail: data.contact_email,
            contactPhone: data.contact_phone,
            address: {
              line1: data.stylist_private?.line1 ?? "",
              line2: data.stylist_private?.line2 ?? "",
              city: data.stylist_private?.city ?? "",
              postcode: data.stylist_private?.postcode ?? "",
            },
            categories: [...data.stylist_categories].sort(
              (left, right) => left.sort - right.sort,
            ),
            services: [...data.services]
              .sort((left, right) => left.sort - right.sort)
              .map((service) => ({
                id: service.id,
                name: service.name,
                description: service.description,
                groupId: service.service_group_id,
                typeId: service.service_type_id,
                categoryId: service.category_id,
                durationMin: service.duration_min,
                pricePence: service.price_pence,
              })),
          },
        };
      },
    }),
  }),
});

export const { useGetProfileQuery, useGetStylistStudioQuery } = api;
