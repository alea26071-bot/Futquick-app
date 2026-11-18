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
      chat_messages: {
        Row: {
          attachment_url: string | null
          body: string
          created_at: string
          id: string
          kind: string
          latitude: number | null
          longitude: number | null
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          attachment_url?: string | null
          body: string
          created_at?: string
          id?: string
          kind?: string
          latitude?: number | null
          longitude?: number | null
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          created_at?: string
          id?: string
          kind?: string
          latitude?: number | null
          longitude?: number | null
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string
          organizer_id: string
          pelada_id: string
          player_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string
          organizer_id: string
          pelada_id: string
          player_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string
          organizer_id?: string
          pelada_id?: string
          player_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      live_locations: {
        Row: {
          accuracy: number | null
          created_at: string
          expires_at: string
          id: string
          latitude: number
          longitude: number
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          expires_at: string
          id?: string
          latitude: number
          longitude: number
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          latitude?: number
          longitude?: number
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_locations_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          dedupe_key: string | null
          id: string
          read_at: string | null
          title: string
          type: string
          url: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          dedupe_key?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pelada_attendance: {
        Row: {
          confirmed_at: string
          confirmed_by: string
          pelada_id: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string
          confirmed_by: string
          pelada_id: string
          user_id: string
        }
        Update: {
          confirmed_at?: string
          confirmed_by?: string
          pelada_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pelada_attendance_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pelada_attendance_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pelada_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_group_messages: {
        Row: {
          attachment_url: string | null
          body: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          kind: string
          latitude: number | null
          longitude: number | null
          pelada_id: string
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          kind?: string
          latitude?: number | null
          longitude?: number | null
          pelada_id: string
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          kind?: string
          latitude?: number | null
          longitude?: number | null
          pelada_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pelada_group_messages_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_likes: {
        Row: {
          created_at: string
          pelada_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          pelada_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          pelada_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pelada_likes_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_mutes: {
        Row: {
          created_at: string
          pelada_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          pelada_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          pelada_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pelada_mutes_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_posture_ratings: {
        Row: {
          created_at: string
          id: string
          organizer_id: string
          pelada_id: string
          rated_id: string
          score: number
        }
        Insert: {
          created_at?: string
          id?: string
          organizer_id: string
          pelada_id: string
          rated_id: string
          score: number
        }
        Update: {
          created_at?: string
          id?: string
          organizer_id?: string
          pelada_id?: string
          rated_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "pelada_posture_ratings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pelada_posture_ratings_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pelada_posture_ratings_rated_id_fkey"
            columns: ["rated_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          pelada_id: string
          presence_verified: boolean
          rated_id: string
          rater_id: string
          score: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          pelada_id: string
          presence_verified?: boolean
          rated_id: string
          rater_id: string
          score: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          pelada_id?: string
          presence_verified?: boolean
          rated_id?: string
          rater_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "pelada_ratings_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          pelada_id: string
          responded_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          pelada_id: string
          responded_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          pelada_id?: string
          responded_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pelada_requests_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      pelada_templates: {
        Row: {
          active: boolean
          address: string
          auto_approve: boolean
          city: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          field_type: string
          id: string
          last_generated_for: string | null
          latitude: number
          level: string
          location_name: string
          longitude: number
          name: string
          organizer_id: string
          photo_url: string | null
          price_cents: number
          time_of_day: string
          total_slots: number
          updated_at: string
          weekday: number
        }
        Insert: {
          active?: boolean
          address: string
          auto_approve?: boolean
          city?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          field_type: string
          id?: string
          last_generated_for?: string | null
          latitude: number
          level: string
          location_name: string
          longitude: number
          name: string
          organizer_id: string
          photo_url?: string | null
          price_cents?: number
          time_of_day: string
          total_slots: number
          updated_at?: string
          weekday: number
        }
        Update: {
          active?: boolean
          address?: string
          auto_approve?: boolean
          city?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          field_type?: string
          id?: string
          last_generated_for?: string | null
          latitude?: number
          level?: string
          location_name?: string
          longitude?: number
          name?: string
          organizer_id?: string
          photo_url?: string | null
          price_cents?: number
          time_of_day?: string
          total_slots?: number
          updated_at?: string
          weekday?: number
        }
        Relationships: []
      }
      peladas: {
        Row: {
          address: string
          auto_approve: boolean
          chat_cleanup_started_at: string | null
          chat_purged_at: string | null
          city: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          field_type: string
          filled_slots: number
          group_mode: string
          id: string
          latitude: number
          level: string
          likes_count: number
          location_name: string
          longitude: number
          name: string
          organizer_id: string
          photo_url: string | null
          price_cents: number
          rating_reminder_sent_at: string | null
          starts_at: string
          status: string
          template_id: string | null
          total_slots: number
          updated_at: string
          waitlist_enabled: boolean
          was_recurring: boolean
        }
        Insert: {
          address: string
          auto_approve?: boolean
          chat_cleanup_started_at?: string | null
          chat_purged_at?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          field_type: string
          filled_slots?: number
          group_mode?: string
          id?: string
          latitude: number
          level: string
          likes_count?: number
          location_name: string
          longitude: number
          name: string
          organizer_id: string
          photo_url?: string | null
          price_cents?: number
          rating_reminder_sent_at?: string | null
          starts_at: string
          status?: string
          template_id?: string | null
          total_slots: number
          updated_at?: string
          waitlist_enabled?: boolean
          was_recurring?: boolean
        }
        Update: {
          address?: string
          auto_approve?: boolean
          chat_cleanup_started_at?: string | null
          chat_purged_at?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          field_type?: string
          filled_slots?: number
          group_mode?: string
          id?: string
          latitude?: number
          level?: string
          likes_count?: number
          location_name?: string
          longitude?: number
          name?: string
          organizer_id?: string
          photo_url?: string | null
          price_cents?: number
          rating_reminder_sent_at?: string | null
          starts_at?: string
          status?: string
          template_id?: string | null
          total_slots?: number
          updated_at?: string
          waitlist_enabled?: boolean
          was_recurring?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "peladas_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pelada_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          cover_photo_paths: string[]
          created_at: string
          favorite_position: string | null
          game_term: string | null
          id: string
          latitude: number | null
          location_updated_at: string | null
          longitude: number | null
          name: string
          notify_radius_km: number | null
          onboarding_complete: boolean
          peladas_played: number
          phone: string | null
          phone_verified: boolean
          postura_score: number
          posture_average: number | null
          rating_avg: number
          stars_average: number | null
          state: string | null
          suspended_at: string | null
          theme_preference: string
          updated_at: string
          username: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cover_photo_paths?: string[]
          created_at?: string
          favorite_position?: string | null
          game_term?: string | null
          id: string
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          name?: string
          notify_radius_km?: number | null
          onboarding_complete?: boolean
          peladas_played?: number
          phone?: string | null
          phone_verified?: boolean
          postura_score?: number
          posture_average?: number | null
          rating_avg?: number
          stars_average?: number | null
          state?: string | null
          suspended_at?: string | null
          theme_preference?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cover_photo_paths?: string[]
          created_at?: string
          favorite_position?: string | null
          game_term?: string | null
          id?: string
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          name?: string
          notify_radius_km?: number | null
          onboarding_complete?: boolean
          peladas_played?: number
          phone?: string | null
          phone_verified?: boolean
          postura_score?: number
          posture_average?: number | null
          rating_avg?: number
          stars_average?: number | null
          state?: string | null
          suspended_at?: string | null
          theme_preference?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          message_body: string | null
          message_id: string | null
          message_source: string | null
          pelada_id: string | null
          reason: string
          reported_user_id: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          message_body?: string | null
          message_id?: string | null
          message_source?: string | null
          pelada_id?: string | null
          reason: string
          reported_user_id?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          message_body?: string | null
          message_id?: string | null
          message_source?: string | null
          pelada_id?: string | null
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_pelada_id_fkey"
            columns: ["pelada_id"]
            isOneToOne: false
            referencedRelation: "peladas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_pelada_participant: {
        Args: { _pelada_id: string; _user_id: string }
        Returns: string
      }
      can_read_chat_object: { Args: { _path: string }; Returns: boolean }
      claim_expired_conversation: {
        Args: { _pelada_id: string }
        Returns: boolean
      }
      confirm_game_attendance: {
        Args: { _pelada_id: string; _user_id: string }
        Returns: undefined
      }
      game_ready_for_ratings: { Args: { _pelada_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked: { Args: { _a: string; _b: string }; Returns: boolean }
      is_group_open: { Args: { _pelada_id: string }; Returns: boolean }
      is_pelada_member: {
        Args: { _pelada_id: string; _user_id: string }
        Returns: boolean
      }
      is_pelada_organizer: {
        Args: { _pelada_id: string; _user_id: string }
        Returns: boolean
      }
      is_thread_open: { Args: { _thread_id: string }; Returns: boolean }
      join_pelada: { Args: { _pelada_id: string }; Returns: string }
      leave_pelada: { Args: { _pelada_id: string }; Returns: string }
      max_slots_for: { Args: { _field: string }; Returns: number }
      pelada_group_maintenance: { Args: never; Returns: undefined }
      pending_game_ratings: {
        Args: never
        Returns: {
          name: string
          pelada_id: string
          pending_count: number
        }[]
      }
      prune_inactive_templates: { Args: never; Returns: number }
      purge_expired_conversation: {
        Args: { _pelada_id: string }
        Returns: boolean
      }
      recompute_player_stats: { Args: { _user_id: string }; Returns: undefined }
      remove_pelada_participant: {
        Args: { _pelada_id: string; _user_id: string }
        Returns: string
      }
      submit_game_posture: {
        Args: { _pelada_id: string; _rated_id: string; _score: number }
        Returns: undefined
      }
      submit_game_stars: {
        Args: { _pelada_id: string; _rated_id: string; _score: number }
        Returns: undefined
      }
      transfer_pelada: {
        Args: { _new_organizer: string; _pelada_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
