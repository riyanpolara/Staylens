export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      amenities: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          check_in: string
          check_out: string
          cleaning_fee: number | null
          created_at: string
          currency: string
          guest_id: string
          guests: number
          id: string
          nightly_price: number | null
          property_id: string
          status: Database["public"]["Enums"]["booking_status_enum"]
          total_price: number | null
          updated_at: string
        }
        Insert: {
          check_in: string
          check_out: string
          cleaning_fee?: number | null
          created_at?: string
          currency?: string
          guest_id: string
          guests?: number
          id?: string
          nightly_price?: number | null
          property_id: string
          status?: Database["public"]["Enums"]["booking_status_enum"]
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          check_in?: string
          check_out?: string
          cleaning_fee?: number | null
          created_at?: string
          currency?: string
          guest_id?: string
          guests?: number
          id?: string
          nightly_price?: number | null
          property_id?: string
          status?: Database["public"]["Enums"]["booking_status_enum"]
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          collection: string
          created_at: string
          id: string
          note: string | null
          property_id: string
          user_id: string
        }
        Insert: {
          collection?: string
          created_at?: string
          id?: string
          note?: string | null
          property_id: string
          user_id: string
        }
        Update: {
          collection?: string
          created_at?: string
          id?: string
          note?: string | null
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          cited_property_ids: string[]
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          token_count: number | null
        }
        Insert: {
          cited_property_ids?: string[]
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          token_count?: number | null
        }
        Update: {
          cited_property_ids?: string[]
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          city_name: string
          continent: string | null
          country: string | null
          created_at: string
          currency: string | null
          id: string
          latitude: number | null
          longitude: number | null
          source_dataset: string | null
          state: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          city_name: string
          continent?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          source_dataset?: string | null
          state?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          city_name?: string
          continent?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          source_dataset?: string | null
          state?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      embeddings: {
        Row: {
          content: string
          content_hash: string
          created_at: string
          embedding: string
          id: string
          model: string
          property_id: string
          updated_at: string
        }
        Insert: {
          content: string
          content_hash: string
          created_at?: string
          embedding: string
          id?: string
          model?: string
          property_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          content_hash?: string
          created_at?: string
          embedding?: string
          id?: string
          model?: string
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hosts: {
        Row: {
          about: string | null
          acceptance_rate: number | null
          created_at: string
          has_profile_pic: boolean
          id: string
          identity_verified: boolean
          is_superhost: boolean
          listings_count: number | null
          location: string | null
          name: string | null
          neighbourhood: string | null
          picture_url: string | null
          response_rate: number | null
          response_time: string | null
          source: Database["public"]["Enums"]["data_source_enum"]
          source_host_id: string
          thumbnail_url: string | null
          total_listings_count: number | null
          updated_at: string
          verifications: string[]
        }
        Insert: {
          about?: string | null
          acceptance_rate?: number | null
          created_at?: string
          has_profile_pic?: boolean
          id?: string
          identity_verified?: boolean
          is_superhost?: boolean
          listings_count?: number | null
          location?: string | null
          name?: string | null
          neighbourhood?: string | null
          picture_url?: string | null
          response_rate?: number | null
          response_time?: string | null
          source?: Database["public"]["Enums"]["data_source_enum"]
          source_host_id: string
          thumbnail_url?: string | null
          total_listings_count?: number | null
          updated_at?: string
          verifications?: string[]
        }
        Update: {
          about?: string | null
          acceptance_rate?: number | null
          created_at?: string
          has_profile_pic?: boolean
          id?: string
          identity_verified?: boolean
          is_superhost?: boolean
          listings_count?: number | null
          location?: string | null
          name?: string | null
          neighbourhood?: string | null
          picture_url?: string | null
          response_rate?: number | null
          response_time?: string | null
          source?: Database["public"]["Enums"]["data_source_enum"]
          source_host_id?: string
          thumbnail_url?: string | null
          total_listings_count?: number | null
          updated_at?: string
          verifications?: string[]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birthday: string | null
          created_at: string
          email: string | null
          email_verified: boolean
          first_name: string | null
          full_name: string | null
          home_currency: string | null
          id: string
          last_login: string | null
          last_name: string | null
          role: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean
          first_name?: string | null
          full_name?: string | null
          home_currency?: string | null
          id: string
          last_login?: string | null
          last_name?: string | null
          role?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean
          first_name?: string | null
          full_name?: string | null
          home_currency?: string | null
          id?: string
          last_login?: string | null
          last_name?: string | null
          role?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          access: string | null
          accommodates: number | null
          availability_30: number | null
          availability_365: number | null
          availability_60: number | null
          availability_90: number | null
          bathrooms: number | null
          bed_type: string | null
          bedrooms: number | null
          beds: number | null
          cancellation_policy: string | null
          city: string | null
          city_id: string | null
          cleaning_fee: number | null
          country: string | null
          country_code: string | null
          created_at: string
          currency: string
          description: string | null
          extra_people: number | null
          first_review: string | null
          government_area: string | null
          guests_included: number | null
          host_id: string | null
          house_rules: string | null
          id: string
          interaction: string | null
          is_active: boolean
          is_location_exact: boolean | null
          last_review: string | null
          last_scraped: string | null
          latitude: number | null
          listing_url: string | null
          longitude: number | null
          market: string | null
          maximum_nights: number | null
          minimum_nights: number | null
          monthly_price: number | null
          name: string
          neighborhood_overview: string | null
          notes: string | null
          number_of_reviews: number
          price: number | null
          property_type: string | null
          review_scores_accuracy: number | null
          review_scores_checkin: number | null
          review_scores_cleanliness: number | null
          review_scores_communication: number | null
          review_scores_location: number | null
          review_scores_rating: number | null
          review_scores_value: number | null
          reviews_per_month: number | null
          room_type: Database["public"]["Enums"]["room_type_enum"] | null
          security_deposit: number | null
          source: Database["public"]["Enums"]["data_source_enum"]
          source_id: string
          space: string | null
          street: string | null
          suburb: string | null
          summary: string | null
          transit: string | null
          updated_at: string
          weekly_price: number | null
        }
        Insert: {
          access?: string | null
          accommodates?: number | null
          availability_30?: number | null
          availability_365?: number | null
          availability_60?: number | null
          availability_90?: number | null
          bathrooms?: number | null
          bed_type?: string | null
          bedrooms?: number | null
          beds?: number | null
          cancellation_policy?: string | null
          city?: string | null
          city_id?: string | null
          cleaning_fee?: number | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          extra_people?: number | null
          first_review?: string | null
          government_area?: string | null
          guests_included?: number | null
          host_id?: string | null
          house_rules?: string | null
          id?: string
          interaction?: string | null
          is_active?: boolean
          is_location_exact?: boolean | null
          last_review?: string | null
          last_scraped?: string | null
          latitude?: number | null
          listing_url?: string | null
          longitude?: number | null
          market?: string | null
          maximum_nights?: number | null
          minimum_nights?: number | null
          monthly_price?: number | null
          name: string
          neighborhood_overview?: string | null
          notes?: string | null
          number_of_reviews?: number
          price?: number | null
          property_type?: string | null
          review_scores_accuracy?: number | null
          review_scores_checkin?: number | null
          review_scores_cleanliness?: number | null
          review_scores_communication?: number | null
          review_scores_location?: number | null
          review_scores_rating?: number | null
          review_scores_value?: number | null
          reviews_per_month?: number | null
          room_type?: Database["public"]["Enums"]["room_type_enum"] | null
          security_deposit?: number | null
          source?: Database["public"]["Enums"]["data_source_enum"]
          source_id: string
          space?: string | null
          street?: string | null
          suburb?: string | null
          summary?: string | null
          transit?: string | null
          updated_at?: string
          weekly_price?: number | null
        }
        Update: {
          access?: string | null
          accommodates?: number | null
          availability_30?: number | null
          availability_365?: number | null
          availability_60?: number | null
          availability_90?: number | null
          bathrooms?: number | null
          bed_type?: string | null
          bedrooms?: number | null
          beds?: number | null
          cancellation_policy?: string | null
          city?: string | null
          city_id?: string | null
          cleaning_fee?: number | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          extra_people?: number | null
          first_review?: string | null
          government_area?: string | null
          guests_included?: number | null
          host_id?: string | null
          house_rules?: string | null
          id?: string
          interaction?: string | null
          is_active?: boolean
          is_location_exact?: boolean | null
          last_review?: string | null
          last_scraped?: string | null
          latitude?: number | null
          listing_url?: string | null
          longitude?: number | null
          market?: string | null
          maximum_nights?: number | null
          minimum_nights?: number | null
          monthly_price?: number | null
          name?: string
          neighborhood_overview?: string | null
          notes?: string | null
          number_of_reviews?: number
          price?: number | null
          property_type?: string | null
          review_scores_accuracy?: number | null
          review_scores_checkin?: number | null
          review_scores_cleanliness?: number | null
          review_scores_communication?: number | null
          review_scores_location?: number | null
          review_scores_rating?: number | null
          review_scores_value?: number | null
          reviews_per_month?: number | null
          room_type?: Database["public"]["Enums"]["room_type_enum"] | null
          security_deposit?: number | null
          source?: Database["public"]["Enums"]["data_source_enum"]
          source_id?: string
          space?: string | null
          street?: string | null
          suburb?: string | null
          summary?: string | null
          transit?: string | null
          updated_at?: string
          weekly_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      property_amenities: {
        Row: {
          amenity_id: string
          property_id: string
        }
        Insert: {
          amenity_id: string
          property_id: string
        }
        Update: {
          amenity_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_amenities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          caption: string | null
          created_at: string
          height: number | null
          id: string
          image_type: string
          is_primary: boolean
          property_id: string
          sort_order: number
          url: string
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          height?: number | null
          id?: string
          image_type?: string
          is_primary?: boolean
          property_id: string
          sort_order?: number
          url: string
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          height?: number | null
          id?: string
          image_type?: string
          is_primary?: boolean
          property_id?: string
          sort_order?: number
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_user_id: string | null
          comments: string | null
          created_at: string
          id: string
          property_id: string
          review_date: string | null
          reviewer_name: string | null
          reviewer_source_id: string | null
          source: Database["public"]["Enums"]["data_source_enum"]
          source_review_id: string | null
        }
        Insert: {
          author_user_id?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          property_id: string
          review_date?: string | null
          reviewer_name?: string | null
          reviewer_source_id?: string | null
          source?: Database["public"]["Enums"]["data_source_enum"]
          source_review_id?: string | null
        }
        Update: {
          author_user_id?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          property_id?: string
          review_date?: string | null
          reviewer_name?: string | null
          reviewer_source_id?: string | null
          source?: Database["public"]["Enums"]["data_source_enum"]
          source_review_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_properties: {
        Args: {
          filter_room_type?: Database["public"]["Enums"]["room_type_enum"]
          match_count?: number
          max_price?: number
          min_accommodates?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          city: string
          country: string
          name: string
          price: number
          property_id: string
          room_type: Database["public"]["Enums"]["room_type_enum"]
          similarity: number
        }[]
      }
      similar_properties: {
        Args: { match_count?: number; source_property_id: string }
        Returns: {
          city: string
          name: string
          price: number
          property_id: string
          similarity: number
        }[]
      }
    }
    Enums: {
      booking_status_enum:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "declined"
      data_source_enum:
        | "mongodb_airbnb"
        | "kaggle_open_data"
        | "user_generated"
        | "inside_airbnb"
      room_type_enum:
        | "Entire home/apt"
        | "Private room"
        | "Shared room"
        | "Hotel room"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status_enum: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "declined",
      ],
      data_source_enum: [
        "mongodb_airbnb",
        "kaggle_open_data",
        "user_generated",
        "inside_airbnb",
      ],
      room_type_enum: [
        "Entire home/apt",
        "Private room",
        "Shared room",
        "Hotel room",
      ],
    },
  },
} as const
