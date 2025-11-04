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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assessment_questions: {
        Row: {
          assessment_id: string
          correct_answer: string
          created_at: string
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_number: number
          question_text: string
        }
        Insert: {
          assessment_id: string
          correct_answer: string
          created_at?: string
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_number: number
          question_text: string
        }
        Update: {
          assessment_id?: string
          correct_answer?: string
          created_at?: string
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_number?: number
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          created_at: string
          custom_topic: string | null
          description: string | null
          expires_at: string | null
          id: string
          psychometric_type:
            | Database["public"]["Enums"]["psychometric_test_type"]
            | null
          recruiter_id: string
          share_link: string
          title: string
        }
        Insert: {
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          created_at?: string
          custom_topic?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          psychometric_type?:
            | Database["public"]["Enums"]["psychometric_test_type"]
            | null
          recruiter_id: string
          share_link?: string
          title: string
        }
        Update: {
          assessment_type?: Database["public"]["Enums"]["assessment_type"]
          created_at?: string
          custom_topic?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          psychometric_type?:
            | Database["public"]["Enums"]["psychometric_test_type"]
            | null
          recruiter_id?: string
          share_link?: string
          title?: string
        }
        Relationships: []
      }
      candidate_responses: {
        Row: {
          answered_at: string
          candidate_id: string
          id: string
          is_correct: boolean
          question_id: string
          selected_answer: string
          time_taken_seconds: number
        }
        Insert: {
          answered_at?: string
          candidate_id: string
          id?: string
          is_correct: boolean
          question_id: string
          selected_answer: string
          time_taken_seconds: number
        }
        Update: {
          answered_at?: string
          candidate_id?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_answer?: string
          time_taken_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidate_responses_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          assessment_id: string
          completed_at: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          started_at: string | null
          total_score: number | null
        }
        Insert: {
          assessment_id: string
          completed_at?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          started_at?: string | null
          total_score?: number | null
        }
        Update: {
          assessment_id?: string
          completed_at?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          started_at?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      assessment_type: "hard_skills" | "soft_skills" | "psychometric"
      psychometric_test_type:
        | "mbti"
        | "disc"
        | "big_five"
        | "emotional_intelligence"
        | "rorschach"
        | "mmpi"
        | "cattell_16pf"
        | "hogan"
        | "caliper"
        | "wonderlic"
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
      assessment_type: ["hard_skills", "soft_skills", "psychometric"],
      psychometric_test_type: [
        "mbti",
        "disc",
        "big_five",
        "emotional_intelligence",
        "rorschach",
        "mmpi",
        "cattell_16pf",
        "hogan",
        "caliper",
        "wonderlic",
      ],
    },
  },
} as const
