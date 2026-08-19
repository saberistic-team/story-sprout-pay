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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      contributions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          node_id: string | null
          parent_node_id: string | null
          payment_provider_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          idempotency_key: string
          node_id?: string | null
          parent_node_id?: string | null
          payment_provider_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string
          node_id?: string | null
          parent_node_id?: string | null
          payment_provider_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "story_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_parent_node_id_fkey"
            columns: ["parent_node_id"]
            isOneToOne: false
            referencedRelation: "story_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings_ledger: {
        Row: {
          amount: number
          contribution_id: string | null
          created_at: string
          entry_type: string
          id: string
          memo: string | null
          node_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          amount: number
          contribution_id?: string | null
          created_at?: string
          entry_type: string
          id?: string
          memo?: string | null
          node_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          contribution_id?: string | null
          created_at?: string
          entry_type?: string
          id?: string
          memo?: string | null
          node_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earnings_ledger_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_ledger_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "story_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          description: string | null
          key: string
          value: number
        }
        Insert: {
          description?: string | null
          key: string
          value: number
        }
        Update: {
          description?: string | null
          key?: string
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name?: string
          id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      royalty_distributions: {
        Row: {
          ancestor_node_id: string
          ancestry_distance: number
          ancestry_weight: number
          contribution_id: string
          created_at: string
          economic_weight: number
          id: string
          payout_amount: number
          popularity_weight: number
          raw_weight: number
          recipient_user_id: string | null
          source_node_id: string
        }
        Insert: {
          ancestor_node_id: string
          ancestry_distance: number
          ancestry_weight: number
          contribution_id: string
          created_at?: string
          economic_weight: number
          id?: string
          payout_amount: number
          popularity_weight: number
          raw_weight: number
          recipient_user_id?: string | null
          source_node_id: string
        }
        Update: {
          ancestor_node_id?: string
          ancestry_distance?: number
          ancestry_weight?: number
          contribution_id?: string
          created_at?: string
          economic_weight?: number
          id?: string
          payout_amount?: number
          popularity_weight?: number
          raw_weight?: number
          recipient_user_id?: string | null
          source_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "royalty_distributions_ancestor_node_id_fkey"
            columns: ["ancestor_node_id"]
            isOneToOne: false
            referencedRelation: "story_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "royalty_distributions_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "royalty_distributions_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "story_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          created_at: string
          id: string
          root_node_id: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          root_node_id?: string | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          root_node_id?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_root_fk"
            columns: ["root_node_id"]
            isOneToOne: false
            referencedRelation: "story_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      story_nodes: {
        Row: {
          ai_generated: boolean
          ai_polished: boolean
          author_id: string | null
          author_name: string
          content: string
          created_at: string
          current_fork_price: number
          depth: number
          descendant_count: number
          downstream_revenue: number
          id: string
          original_price_paid: number
          parent_node_id: string | null
          story_id: string
          upvote_count: number
        }
        Insert: {
          ai_generated?: boolean
          ai_polished?: boolean
          author_id?: string | null
          author_name?: string
          content: string
          created_at?: string
          current_fork_price?: number
          depth?: number
          descendant_count?: number
          downstream_revenue?: number
          id?: string
          original_price_paid?: number
          parent_node_id?: string | null
          story_id: string
          upvote_count?: number
        }
        Update: {
          ai_generated?: boolean
          ai_polished?: boolean
          author_id?: string | null
          author_name?: string
          content?: string
          created_at?: string
          current_fork_price?: number
          depth?: number
          descendant_count?: number
          downstream_revenue?: number
          id?: string
          original_price_paid?: number
          parent_node_id?: string | null
          story_id?: string
          upvote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "story_nodes_parent_node_id_fkey"
            columns: ["parent_node_id"]
            isOneToOne: false
            referencedRelation: "story_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_nodes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          id: string
          node_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          node_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          node_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "story_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      config_value: {
        Args: { p_default: number; p_key: string }
        Returns: number
      }
      fork_price: { Args: { p_subtree_size: number }; Returns: number }
      publish_contribution: {
        Args: {
          p_ai_generated: boolean
          p_ai_polished: boolean
          p_content: string
          p_idempotency_key: string
          p_parent_node_id: string
          p_payment_provider_id?: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
