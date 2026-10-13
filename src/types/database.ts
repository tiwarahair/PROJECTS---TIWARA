export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      customisation_options: {
        Row: {
          group_id: string;
          id: number;
          kind: string;
          label: string;
          minutes_delta: number;
          price_delta_pence: number;
          sort: number;
        };
        ComputedFields: never;
        Insert: {
          group_id: string;
          id?: never;
          kind: string;
          label: string;
          minutes_delta: number;
          price_delta_pence: number;
          sort: number;
        };
        Update: {
          group_id?: string;
          id?: never;
          kind?: string;
          label?: string;
          minutes_delta?: number;
          price_delta_pence?: number;
          sort?: number;
        };
        Relationships: [
          {
            foreignKeyName: "customisation_options_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "service_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      default_addons: {
        Row: {
          group_id: string;
          id: number;
          minutes: number;
          name: string;
          price_pence: number;
          sort: number;
        };
        ComputedFields: never;
        Insert: {
          group_id: string;
          id?: never;
          minutes: number;
          name: string;
          price_pence: number;
          sort: number;
        };
        Update: {
          group_id?: string;
          id?: never;
          minutes?: number;
          name?: string;
          price_pence?: number;
          sort?: number;
        };
        Relationships: [
          {
            foreignKeyName: "default_addons_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "service_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          client_terms_accepted_at: string | null;
          client_terms_version: string | null;
          created_at: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
          marketing_opt_in: boolean;
          phone: string | null;
        };
        ComputedFields: never;
        Insert: {
          client_terms_accepted_at?: string | null;
          client_terms_version?: string | null;
          created_at?: string;
          first_name?: string | null;
          id: string;
          last_name?: string | null;
          marketing_opt_in?: boolean;
          phone?: string | null;
        };
        Update: {
          client_terms_accepted_at?: string | null;
          client_terms_version?: string | null;
          created_at?: string;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          marketing_opt_in?: boolean;
          phone?: string | null;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          count: number;
          key: string;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          count?: number;
          key: string;
          window_start: string;
        };
        Update: {
          count?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      service_groups: {
        Row: {
          description: string;
          icon: string;
          id: string;
          image: string;
          name: string;
          sort: number;
        };
        ComputedFields: never;
        Insert: {
          description: string;
          icon: string;
          id: string;
          image: string;
          name: string;
          sort: number;
        };
        Update: {
          description?: string;
          icon?: string;
          id?: string;
          image?: string;
          name?: string;
          sort?: number;
        };
        Relationships: [];
      };
      service_types: {
        Row: {
          active: boolean;
          added_price_pence: number | null;
          default_description: string | null;
          default_minutes: number | null;
          group_id: string;
          id: string;
          is_other: boolean;
          name: string;
          sort: number;
          synonyms: string[];
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          added_price_pence?: number | null;
          default_description?: string | null;
          default_minutes?: number | null;
          group_id: string;
          id: string;
          is_other?: boolean;
          name: string;
          sort: number;
          synonyms?: string[];
        };
        Update: {
          active?: boolean;
          added_price_pence?: number | null;
          default_description?: string | null;
          default_minutes?: number | null;
          group_id?: string;
          id?: string;
          is_other?: boolean;
          name?: string;
          sort?: number;
          synonyms?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "service_types_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "service_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          category_id: string | null;
          description: string | null;
          duration_min: number | null;
          extra_time_min: number | null;
          id: string;
          name: string;
          price_pence: number | null;
          service_group_id: string;
          service_type_id: string;
          sort: number;
          status: string;
          stylist_id: string;
        };
        ComputedFields: never;
        Insert: {
          category_id?: string | null;
          description?: string | null;
          duration_min?: number | null;
          extra_time_min?: number | null;
          id?: string;
          name: string;
          price_pence?: number | null;
          service_group_id: string;
          service_type_id: string;
          sort: number;
          status?: string;
          stylist_id: string;
        };
        Update: {
          category_id?: string | null;
          description?: string | null;
          duration_min?: number | null;
          extra_time_min?: number | null;
          id?: string;
          name?: string;
          price_pence?: number | null;
          service_group_id?: string;
          service_type_id?: string;
          sort?: number;
          status?: string;
          stylist_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "stylist_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "services_service_group_id_fkey";
            columns: ["service_group_id"];
            isOneToOne: false;
            referencedRelation: "service_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "services_service_type_id_fkey";
            columns: ["service_type_id"];
            isOneToOne: false;
            referencedRelation: "service_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "services_stylist_id_fkey";
            columns: ["stylist_id"];
            isOneToOne: false;
            referencedRelation: "stylists";
            referencedColumns: ["id"];
          },
        ];
      };
      stylist_categories: {
        Row: {
          colour: string | null;
          id: string;
          name: string;
          service_group_id: string | null;
          sort: number;
          stylist_id: string;
        };
        ComputedFields: never;
        Insert: {
          colour?: string | null;
          id?: string;
          name: string;
          service_group_id?: string | null;
          sort: number;
          stylist_id: string;
        };
        Update: {
          colour?: string | null;
          id?: string;
          name?: string;
          service_group_id?: string | null;
          sort?: number;
          stylist_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stylist_categories_service_group_id_fkey";
            columns: ["service_group_id"];
            isOneToOne: false;
            referencedRelation: "service_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stylist_categories_stylist_id_fkey";
            columns: ["stylist_id"];
            isOneToOne: false;
            referencedRelation: "stylists";
            referencedColumns: ["id"];
          },
        ];
      };
      stylist_private: {
        Row: {
          city: string | null;
          line1: string | null;
          line2: string | null;
          postcode: string;
          stylist_id: string;
        };
        ComputedFields: never;
        Insert: {
          city?: string | null;
          line1?: string | null;
          line2?: string | null;
          postcode: string;
          stylist_id: string;
        };
        Update: {
          city?: string | null;
          line1?: string | null;
          line2?: string | null;
          postcode?: string;
          stylist_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stylist_private_stylist_id_fkey";
            columns: ["stylist_id"];
            isOneToOne: true;
            referencedRelation: "stylists";
            referencedColumns: ["id"];
          },
        ];
      };
      stylists: {
        Row: {
          area_label: string | null;
          bio: string | null;
          business_name: string;
          business_type: string;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          id: string;
          location: unknown;
          owner_id: string;
          partner_terms_accepted_at: string;
          partner_terms_version: string;
          referral_source: string | null;
          slug: string;
          status: string;
          travel_radius_miles: number | null;
        };
        ComputedFields: never;
        Insert: {
          area_label?: string | null;
          bio?: string | null;
          business_name: string;
          business_type: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          id?: string;
          location: unknown;
          owner_id: string;
          partner_terms_accepted_at?: string;
          partner_terms_version: string;
          referral_source?: string | null;
          slug: string;
          status?: string;
          travel_radius_miles?: number | null;
        };
        Update: {
          area_label?: string | null;
          bio?: string | null;
          business_name?: string;
          business_type?: string;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          id?: string;
          location?: unknown;
          owner_id?: string;
          partner_terms_accepted_at?: string;
          partner_terms_version?: string;
          referral_source?: string | null;
          slug?: string;
          status?: string;
          travel_radius_miles?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "stylists_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_aal2: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_stylist_owner: {
        Args: { target_stylist_id: string };
        Returns: boolean;
      };
      slugify: { Args: { value: string }; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
