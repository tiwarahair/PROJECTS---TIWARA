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
      addons: {
        Row: {
          category_id: string | null;
          created_at: string;
          id: string;
          minutes: number;
          name: string;
          price_pence: number;
          service_group_id: string | null;
          status: string;
          stylist_id: string;
        };
        ComputedFields: never;
        Insert: {
          category_id?: string | null;
          created_at?: string;
          id?: string;
          minutes?: number;
          name: string;
          price_pence?: number;
          service_group_id?: string | null;
          status?: string;
          stylist_id: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          id?: string;
          minutes?: number;
          name?: string;
          price_pence?: number;
          service_group_id?: string | null;
          status?: string;
          stylist_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "addons_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "stylist_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "addons_service_group_id_fkey";
            columns: ["service_group_id"];
            isOneToOne: false;
            referencedRelation: "service_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "addons_stylist_id_fkey";
            columns: ["stylist_id"];
            isOneToOne: false;
            referencedRelation: "stylists";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_rules: {
        Row: {
          default_extra_minutes: number;
          max_notice_months: number;
          min_notice_hours: number;
          stylist_id: string;
          travel_buffer_minutes: number;
        };
        ComputedFields: never;
        Insert: {
          default_extra_minutes?: number;
          max_notice_months?: number;
          min_notice_hours?: number;
          stylist_id: string;
          travel_buffer_minutes?: number;
        };
        Update: {
          default_extra_minutes?: number;
          max_notice_months?: number;
          min_notice_hours?: number;
          stylist_id?: string;
          travel_buffer_minutes?: number;
        };
        Relationships: [
          {
            foreignKeyName: "booking_rules_stylist_id_fkey";
            columns: ["stylist_id"];
            isOneToOne: true;
            referencedRelation: "stylists";
            referencedColumns: ["id"];
          },
        ];
      };
      closed_periods: {
        Row: {
          ends_on: string;
          id: string;
          reason: string;
          starts_on: string;
          stylist_id: string;
        };
        ComputedFields: never;
        Insert: {
          ends_on: string;
          id?: string;
          reason?: string;
          starts_on: string;
          stylist_id: string;
        };
        Update: {
          ends_on?: string;
          id?: string;
          reason?: string;
          starts_on?: string;
          stylist_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "closed_periods_stylist_id_fkey";
            columns: ["stylist_id"];
            isOneToOne: false;
            referencedRelation: "stylists";
            referencedColumns: ["id"];
          },
        ];
      };
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
      notification_preferences: {
        Row: {
          email: boolean;
          event: string;
          sms: boolean;
          stylist_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          email?: boolean;
          event: string;
          sms?: boolean;
          stylist_id: string;
          updated_at?: string;
        };
        Update: {
          email?: boolean;
          event?: string;
          sms?: boolean;
          stylist_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_stylist_id_fkey";
            columns: ["stylist_id"];
            isOneToOne: false;
            referencedRelation: "stylists";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          attempts: number;
          channel: string;
          created_at: string;
          id: string;
          last_error: string | null;
          payload: NonNullable<Json>;
          send_after: string;
          sent_at: string | null;
          status: string;
          template: string;
          to_address: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          channel: string;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          payload?: NonNullable<Json>;
          send_after?: string;
          sent_at?: string | null;
          status?: string;
          template: string;
          to_address: string;
          user_id?: string | null;
        };
        Update: {
          attempts?: number;
          channel?: string;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          payload?: NonNullable<Json>;
          send_after?: string;
          sent_at?: string | null;
          status?: string;
          template?: string;
          to_address?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_policies: {
        Row: {
          created_at: string;
          deposit_percent: number;
          extras: NonNullable<Json>;
          free_window_hours: number;
          grace_minutes: number;
          id: string;
          late_kind: string;
          late_on: boolean;
          late_percent: number;
          mode: string;
          no_show_kind: string;
          no_show_on: boolean;
          no_show_percent: number;
          refundable: boolean;
          stylist_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          deposit_percent?: number;
          extras?: NonNullable<Json>;
          free_window_hours?: number;
          grace_minutes?: number;
          id?: string;
          late_kind?: string;
          late_on?: boolean;
          late_percent?: number;
          mode: string;
          no_show_kind?: string;
          no_show_on?: boolean;
          no_show_percent?: number;
          refundable?: boolean;
          stylist_id: string;
        };
        Update: {
          created_at?: string;
          deposit_percent?: number;
          extras?: NonNullable<Json>;
          free_window_hours?: number;
          grace_minutes?: number;
          id?: string;
          late_kind?: string;
          late_on?: boolean;
          late_percent?: number;
          mode?: string;
          no_show_kind?: string;
          no_show_on?: boolean;
          no_show_percent?: number;
          refundable?: boolean;
          stylist_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_policies_stylist_id_fkey";
            columns: ["stylist_id"];
            isOneToOne: false;
            referencedRelation: "stylists";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolio_photos: {
        Row: {
          created_at: string;
          id: string;
          path: string;
          sort: number;
          stylist_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          path: string;
          sort: number;
          stylist_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          path?: string;
          sort?: number;
          stylist_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_photos_stylist_id_fkey";
            columns: ["stylist_id"];
            isOneToOne: false;
            referencedRelation: "stylists";
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
      reserved_slugs: {
        Row: {
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          slug: string;
        };
        Update: {
          slug?: string;
        };
        Relationships: [];
      };
      service_addons: {
        Row: {
          addon_id: string;
          minutes_override: number | null;
          price_override_pence: number | null;
          service_id: string;
        };
        ComputedFields: never;
        Insert: {
          addon_id: string;
          minutes_override?: number | null;
          price_override_pence?: number | null;
          service_id: string;
        };
        Update: {
          addon_id?: string;
          minutes_override?: number | null;
          price_override_pence?: number | null;
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_addons_addon_id_fkey";
            columns: ["addon_id"];
            isOneToOne: false;
            referencedRelation: "addons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_addons_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
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
      service_variations: {
        Row: {
          group_name: string | null;
          id: string;
          kind: string;
          label: string;
          minutes_delta: number;
          offered: boolean;
          price_delta_pence: number;
          service_id: string;
          sort: number;
        };
        ComputedFields: never;
        Insert: {
          group_name?: string | null;
          id?: string;
          kind: string;
          label: string;
          minutes_delta?: number;
          offered?: boolean;
          price_delta_pence?: number;
          service_id: string;
          sort: number;
        };
        Update: {
          group_name?: string | null;
          id?: string;
          kind?: string;
          label?: string;
          minutes_delta?: number;
          offered?: boolean;
          price_delta_pence?: number;
          service_id?: string;
          sort?: number;
        };
        Relationships: [
          {
            foreignKeyName: "service_variations_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
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
          lengths_on: boolean;
          name: string;
          price_pence: number | null;
          service_group_id: string;
          service_type_id: string;
          sizes_on: boolean;
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
          lengths_on?: boolean;
          name: string;
          price_pence?: number | null;
          service_group_id: string;
          service_type_id: string;
          sizes_on?: boolean;
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
          lengths_on?: boolean;
          name?: string;
          price_pence?: number | null;
          service_group_id?: string;
          service_type_id?: string;
          sizes_on?: boolean;
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
      stripe_events: {
        Row: {
          id: string;
          received_at: string;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          id: string;
          received_at?: string;
          type: string;
        };
        Update: {
          id?: string;
          received_at?: string;
          type?: string;
        };
        Relationships: [];
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
      stylist_slug_history: {
        Row: {
          retired_at: string;
          slug: string;
          stylist_id: string;
        };
        ComputedFields: never;
        Insert: {
          retired_at?: string;
          slug: string;
          stylist_id: string;
        };
        Update: {
          retired_at?: string;
          slug?: string;
          stylist_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stylist_slug_history_stylist_id_fkey";
            columns: ["stylist_id"];
            isOneToOne: false;
            referencedRelation: "stylists";
            referencedColumns: ["id"];
          },
        ];
      };
      stylist_tax_details: {
        Row: {
          city: string | null;
          company_name: string | null;
          company_number: string | null;
          date_of_birth: string | null;
          first_name: string | null;
          is_address_same: boolean;
          kind: string;
          last_name: string | null;
          legal_name: string | null;
          line1: string | null;
          line2: string | null;
          middle_name: string | null;
          ni_ciphertext: string | null;
          ni_hint: string | null;
          postcode: string | null;
          stylist_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          city?: string | null;
          company_name?: string | null;
          company_number?: string | null;
          date_of_birth?: string | null;
          first_name?: string | null;
          is_address_same?: boolean;
          kind: string;
          last_name?: string | null;
          legal_name?: string | null;
          line1?: string | null;
          line2?: string | null;
          middle_name?: string | null;
          ni_ciphertext?: string | null;
          ni_hint?: string | null;
          postcode?: string | null;
          stylist_id: string;
          updated_at?: string;
        };
        Update: {
          city?: string | null;
          company_name?: string | null;
          company_number?: string | null;
          date_of_birth?: string | null;
          first_name?: string | null;
          is_address_same?: boolean;
          kind?: string;
          last_name?: string | null;
          legal_name?: string | null;
          line1?: string | null;
          line2?: string | null;
          middle_name?: string | null;
          ni_ciphertext?: string | null;
          ni_hint?: string | null;
          postcode?: string | null;
          stylist_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stylist_tax_details_stylist_id_fkey";
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
          availability_confirmed_at: string | null;
          avatar_path: string | null;
          bio: string | null;
          business_name: string;
          business_type: string;
          charges_enabled: boolean;
          closed_at: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          cover_path: string | null;
          created_at: string;
          details_submitted: boolean;
          id: string;
          instagram: string | null;
          location: unknown;
          owner_id: string | null;
          partner_terms_accepted_at: string;
          partner_terms_version: string;
          pause_on: boolean;
          pause_until: string | null;
          payout_bank: string | null;
          payouts_enabled: boolean;
          profile_confirmed_at: string | null;
          referral_source: string | null;
          slug: string;
          slug_changed_at: string | null;
          status: string;
          stripe_account_id: string | null;
          stripe_requirements: string;
          stripe_synced_at: string | null;
          tiktok: string | null;
          travel_radius_miles: number | null;
          vat_number: string | null;
          vat_registered: boolean;
          website: string | null;
          youtube: string | null;
        };
        ComputedFields: never;
        Insert: {
          area_label?: string | null;
          availability_confirmed_at?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          business_name: string;
          business_type: string;
          charges_enabled?: boolean;
          closed_at?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          cover_path?: string | null;
          created_at?: string;
          details_submitted?: boolean;
          id?: string;
          instagram?: string | null;
          location?: unknown;
          owner_id?: string | null;
          partner_terms_accepted_at?: string;
          partner_terms_version: string;
          pause_on?: boolean;
          pause_until?: string | null;
          payout_bank?: string | null;
          payouts_enabled?: boolean;
          profile_confirmed_at?: string | null;
          referral_source?: string | null;
          slug: string;
          slug_changed_at?: string | null;
          status?: string;
          stripe_account_id?: string | null;
          stripe_requirements?: string;
          stripe_synced_at?: string | null;
          tiktok?: string | null;
          travel_radius_miles?: number | null;
          vat_number?: string | null;
          vat_registered?: boolean;
          website?: string | null;
          youtube?: string | null;
        };
        Update: {
          area_label?: string | null;
          availability_confirmed_at?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          business_name?: string;
          business_type?: string;
          charges_enabled?: boolean;
          closed_at?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          cover_path?: string | null;
          created_at?: string;
          details_submitted?: boolean;
          id?: string;
          instagram?: string | null;
          location?: unknown;
          owner_id?: string | null;
          partner_terms_accepted_at?: string;
          partner_terms_version?: string;
          pause_on?: boolean;
          pause_until?: string | null;
          payout_bank?: string | null;
          payouts_enabled?: boolean;
          profile_confirmed_at?: string | null;
          referral_source?: string | null;
          slug?: string;
          slug_changed_at?: string | null;
          status?: string;
          stripe_account_id?: string | null;
          stripe_requirements?: string;
          stripe_synced_at?: string | null;
          tiktok?: string | null;
          travel_radius_miles?: number | null;
          vat_number?: string | null;
          vat_registered?: boolean;
          website?: string | null;
          youtube?: string | null;
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
      time_blocks: {
        Row: {
          all_day: boolean;
          colour: string;
          end_time: string | null;
          id: string;
          reason: string;
          repeat: string;
          repeat_until: string | null;
          start_time: string | null;
          starts_on: string;
          stylist_id: string;
        };
        ComputedFields: never;
        Insert: {
          all_day?: boolean;
          colour?: string;
          end_time?: string | null;
          id?: string;
          reason?: string;
          repeat?: string;
          repeat_until?: string | null;
          start_time?: string | null;
          starts_on: string;
          stylist_id: string;
        };
        Update: {
          all_day?: boolean;
          colour?: string;
          end_time?: string | null;
          id?: string;
          reason?: string;
          repeat?: string;
          repeat_until?: string | null;
          start_time?: string | null;
          starts_on?: string;
          stylist_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_blocks_stylist_id_fkey";
            columns: ["stylist_id"];
            isOneToOne: false;
            referencedRelation: "stylists";
            referencedColumns: ["id"];
          },
        ];
      };
      working_hours: {
        Row: {
          end_time: string;
          is_open: boolean;
          start_time: string;
          stylist_id: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          end_time: string;
          is_open?: boolean;
          start_time: string;
          stylist_id: string;
          weekday: number;
        };
        Update: {
          end_time?: string;
          is_open?: boolean;
          start_time?: string;
          stylist_id?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "working_hours_stylist_id_fkey";
            columns: ["stylist_id"];
            isOneToOne: false;
            referencedRelation: "stylists";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      become_stylist: { Args: { details: Json }; Returns: undefined };
      change_slug: { Args: { new_slug: string }; Returns: string };
      claim_notifications: {
        Args: { batch_size?: number };
        Returns: {
          attempts: number;
          channel: string;
          created_at: string;
          id: string;
          last_error: string | null;
          payload: NonNullable<Json>;
          send_after: string;
          sent_at: string | null;
          status: string;
          template: string;
          to_address: string;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "notifications";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      close_business: { Args: Record<PropertyKey, never>; Returns: undefined };
      create_stylist_business: {
        Args: { meta: Json; new_owner_id: string };
        Returns: string;
      };
      get_account_kind: { Args: { lookup_email: string }; Returns: string };
      get_due_closure_photos: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      get_due_closures: { Args: Record<PropertyKey, never>; Returns: string[] };
      get_unique_slug: { Args: { business_name: string }; Returns: string };
      has_recent_second_factor: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      has_second_factor: { Args: Record<PropertyKey, never>; Returns: boolean };
      hit_rate_limit: {
        Args: { limit_key: string; max_hits: number; window_seconds: number };
        Returns: boolean;
      };
      is_aal2: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_service_owner: {
        Args: { target_service_id: string };
        Returns: boolean;
      };
      is_slug_free: {
        Args: { candidate: string; for_stylist?: string };
        Returns: boolean;
      };
      is_stylist_owner: {
        Args: { target_stylist_id: string };
        Returns: boolean;
      };
      is_valid_slug: { Args: { candidate: string }; Returns: boolean };
      mark_notification_failed: {
        Args: { error: string; notification_id: string };
        Returns: undefined;
      };
      mark_notification_sent: {
        Args: { notification_id: string };
        Returns: undefined;
      };
      owns_photo_path: { Args: { object_name: string }; Returns: boolean };
      purge_closed_businesses: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      purge_old_notifications: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      queue_email: {
        Args: {
          payload: Json;
          template: string;
          to_address: string;
          user_id?: string;
        };
        Returns: string;
      };
      refresh_go_live: { Args: { target: string }; Returns: undefined };
      reopen_business: { Args: Record<PropertyKey, never>; Returns: undefined };
      resolve_slug: { Args: { lookup: string }; Returns: string };
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
