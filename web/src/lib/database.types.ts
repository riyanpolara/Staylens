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
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          check_in: string
          check_out: string
          cleaning_fee: number | null
          commission: number | null
          created_at: string
          currency: string
          guest_id: string
          guests: number
          id: string
          nightly_price: number | null
          nights: number | null
          payment_status: Database["public"]["Enums"]["payment_status_enum"]
          property_id: string
          reference: string
          status: Database["public"]["Enums"]["booking_status_enum"]
          total_price: number | null
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          check_in: string
          check_out: string
          cleaning_fee?: number | null
          commission?: number | null
          created_at?: string
          currency?: string
          guest_id: string
          guests?: number
          id?: string
          nightly_price?: number | null
          nights?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status_enum"]
          property_id: string
          reference?: string
          status?: Database["public"]["Enums"]["booking_status_enum"]
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          check_in?: string
          check_out?: string
          cleaning_fee?: number | null
          commission?: number | null
          created_at?: string
          currency?: string
          guest_id?: string
          guests?: number
          id?: string
          nightly_price?: number | null
          nights?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status_enum"]
          property_id?: string
          reference?: string
          status?: Database["public"]["Enums"]["booking_status_enum"]
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "admin_users_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "admin_users_base"
            referencedColumns: ["id"]
          },
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
      conversations: {
        Row: {
          booking_id: string | null
          created_at: string
          guest_id: string
          guest_unread: number
          host_profile_id: string | null
          host_unread: number
          host_user_id: string | null
          id: string
          last_message: string | null
          last_message_at: string | null
          property_id: string | null
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          guest_id: string
          guest_unread?: number
          host_profile_id?: string | null
          host_unread?: number
          host_user_id?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          property_id?: string | null
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          guest_id?: string
          guest_unread?: number
          host_profile_id?: string | null
          host_unread?: number
          host_user_id?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          property_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_host_profile_id_fkey"
            columns: ["host_profile_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string | null
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string | null
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_read: boolean
          link: string | null
          metadata: Json
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "admin_users_base"
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
            referencedRelation: "admin_users_base"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "admin_users_base"
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
          country: string | null
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
          status: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          country?: string | null
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
          status?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          country?: string | null
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
          status?: string
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
          is_featured: boolean
          is_location_exact: boolean | null
          last_review: string | null
          last_scraped: string | null
          latitude: number | null
          listing_url: string | null
          longitude: number | null
          market: string | null
          maximum_nights: number | null
          minimum_nights: number | null
          moderation_note: string | null
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
          reviewed_at: string | null
          reviewed_by: string | null
          reviews_per_month: number | null
          room_type: Database["public"]["Enums"]["room_type_enum"] | null
          security_deposit: number | null
          source: Database["public"]["Enums"]["data_source_enum"]
          source_id: string
          space: string | null
          status: Database["public"]["Enums"]["property_status_enum"]
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
          is_featured?: boolean
          is_location_exact?: boolean | null
          last_review?: string | null
          last_scraped?: string | null
          latitude?: number | null
          listing_url?: string | null
          longitude?: number | null
          market?: string | null
          maximum_nights?: number | null
          minimum_nights?: number | null
          moderation_note?: string | null
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
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviews_per_month?: number | null
          room_type?: Database["public"]["Enums"]["room_type_enum"] | null
          security_deposit?: number | null
          source?: Database["public"]["Enums"]["data_source_enum"]
          source_id: string
          space?: string | null
          status?: Database["public"]["Enums"]["property_status_enum"]
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
          is_featured?: boolean
          is_location_exact?: boolean | null
          last_review?: string | null
          last_scraped?: string | null
          latitude?: number | null
          listing_url?: string | null
          longitude?: number | null
          market?: string | null
          maximum_nights?: number | null
          minimum_nights?: number | null
          moderation_note?: string | null
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
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviews_per_month?: number | null
          room_type?: Database["public"]["Enums"]["room_type_enum"] | null
          security_deposit?: number | null
          source?: Database["public"]["Enums"]["data_source_enum"]
          source_id?: string
          space?: string | null
          status?: Database["public"]["Enums"]["property_status_enum"]
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
          {
            foreignKeyName: "properties_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_users_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "admin_users_base"
            referencedColumns: ["id"]
          },
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
      admin_bookings_view: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          check_in: string | null
          check_out: string | null
          cleaning_fee: number | null
          commission: number | null
          created_at: string | null
          currency: string | null
          guest_avatar_url: string | null
          guest_email: string | null
          guest_id: string | null
          guest_name: string | null
          guest_username: string | null
          guests: number | null
          host_id: string | null
          host_is_superhost: boolean | null
          host_name: string | null
          id: string | null
          nightly_price: number | null
          nights: number | null
          payment_status:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          property_city: string | null
          property_country: string | null
          property_id: string | null
          property_name: string | null
          property_type: string | null
          reference: string | null
          room_type: Database["public"]["Enums"]["room_type_enum"] | null
          status: Database["public"]["Enums"]["booking_status_enum"] | null
          total_price: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "admin_users_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "admin_users_base"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "properties_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users_base: {
        Row: {
          avatar_url: string | null
          banned_until: string | null
          booking_count: number | null
          country: string | null
          created_at: string | null
          email: string | null
          email_verified: boolean | null
          id: string | null
          last_sign_in_at: string | null
          name: string | null
          role: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_booking_cancel: {
        Args: { p_id: string; p_reason: string; p_refund?: boolean }
        Returns: Json
      }
      admin_booking_detail: { Args: { p_id: string }; Returns: Json }
      admin_booking_set_payment: {
        Args: { p_id: string; p_payment: string }
        Returns: Json
      }
      admin_booking_set_status: {
        Args: { p_id: string; p_status: string }
        Returns: Json
      }
      admin_bookings_list: {
        Args: {
          p_dir?: string
          p_from?: string
          p_page?: number
          p_page_size?: number
          p_payment?: string
          p_search?: string
          p_sort?: string
          p_status?: string
          p_to?: string
        }
        Returns: Json
      }
      admin_properties_list: {
        Args: {
          p_dir?: string
          p_featured?: boolean
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_sort?: string
          p_status?: string
          p_type?: string
        }
        Returns: Json
      }
      admin_property_detail: { Args: { p_id: string }; Returns: Json }
      admin_user_delete: { Args: { p_id: string }; Returns: Json }
      admin_user_detail: { Args: { p_id: string }; Returns: Json }
      admin_user_set_role: {
        Args: { p_id: string; p_role: string }
        Returns: Json
      }
      admin_user_set_status: {
        Args: { p_id: string; p_status: string }
        Returns: Json
      }
      admin_revenue_dashboard: {
        Args: { p_bucket?: string; p_from?: string; p_to?: string }
        Returns: Json
      }
      booking_cancellation_quote: { Args: { p_id: string }; Returns: Json }
      cancel_my_booking: { Args: { p_id: string; p_reason?: string }; Returns: Json }
      refund_percent_for: {
        Args: {
          p_booked_at: string
          p_check_in: string
          p_now?: string
          p_policy: string
        }
        Returns: number
      }
      settle_refund: { Args: { p_id: string }; Returns: Json }
      admin_review_detail: { Args: { p_id: string }; Returns: Json }
      admin_review_set_status: {
        Args: { p_id: string; p_note?: string; p_status: string }
        Returns: Json
      }
      admin_reviews_list: {
        Args: {
          p_dir?: string
          p_page?: number
          p_page_size?: number
          p_rating?: number
          p_search?: string
          p_sort?: string
          p_source?: string
          p_status?: string
        }
        Returns: Json
      }
      admin_reviews_status_counts: { Args: never; Returns: Json }
      admin_users_list: {
        Args: {
          p_dir?: string
          p_page?: number
          p_page_size?: number
          p_role?: string
          p_search?: string
          p_sort?: string
          p_status?: string
        }
        Returns: Json
      }
      get_user_stats: { Args: never; Returns: Json }
      is_admin: { Args: { uid?: string }; Returns: boolean }
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
      payment_status_enum: "pending" | "paid" | "failed" | "refunded"
      property_status_enum: "live" | "pending" | "suspended" | "draft"
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
      payment_status_enum: ["pending", "paid", "failed", "refunded"],
      property_status_enum: ["live", "pending", "suspended", "draft"],
      room_type_enum: [
        "Entire home/apt",
        "Private room",
        "Shared room",
        "Hotel room",
      ],
    },
  },
} as const
