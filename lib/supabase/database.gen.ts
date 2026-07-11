export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
      concepts: {
        Row: {
          created_at: string;
          equation_md: string | null;
          failure_modes_md: string | null;
          fts: unknown;
          id: string;
          misconceptions_md: string | null;
          my_implementations_md: string | null;
          name: string;
          plain_definition_md: string | null;
          slug: string;
          technical_definition_md: string | null;
          updated_at: string;
          user_id: string;
          visibility: Database["public"]["Enums"]["visibility"];
          why_it_helps_md: string | null;
        };
        Insert: {
          created_at?: string;
          equation_md?: string | null;
          failure_modes_md?: string | null;
          fts?: unknown;
          id?: string;
          misconceptions_md?: string | null;
          my_implementations_md?: string | null;
          name: string;
          plain_definition_md?: string | null;
          slug: string;
          technical_definition_md?: string | null;
          updated_at?: string;
          user_id: string;
          visibility?: Database["public"]["Enums"]["visibility"];
          why_it_helps_md?: string | null;
        };
        Update: {
          created_at?: string;
          equation_md?: string | null;
          failure_modes_md?: string | null;
          fts?: unknown;
          id?: string;
          misconceptions_md?: string | null;
          my_implementations_md?: string | null;
          name?: string;
          plain_definition_md?: string | null;
          slug?: string;
          technical_definition_md?: string | null;
          updated_at?: string;
          user_id?: string;
          visibility?: Database["public"]["Enums"]["visibility"];
          why_it_helps_md?: string | null;
        };
        Relationships: [];
      };
      experiment_concepts: {
        Row: {
          concept_id: string;
          experiment_id: string;
          user_id: string;
        };
        Insert: {
          concept_id: string;
          experiment_id: string;
          user_id: string;
        };
        Update: {
          concept_id?: string;
          experiment_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "experiment_concepts_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "concepts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "experiment_concepts_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: false;
            referencedRelation: "experiments";
            referencedColumns: ["id"];
          },
        ];
      };
      experiment_papers: {
        Row: {
          experiment_id: string;
          paper_id: string;
          user_id: string;
        };
        Insert: {
          experiment_id: string;
          paper_id: string;
          user_id: string;
        };
        Update: {
          experiment_id?: string;
          paper_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "experiment_papers_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: false;
            referencedRelation: "experiments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "experiment_papers_paper_id_fkey";
            columns: ["paper_id"];
            isOneToOne: false;
            referencedRelation: "papers";
            referencedColumns: ["id"];
          },
        ];
      };
      experiments: {
        Row: {
          baseline: string | null;
          branch_ref: string | null;
          created_at: string;
          dataset: string | null;
          failure_cases_md: string | null;
          fts: unknown;
          happened_on: string | null;
          hypothesis: string | null;
          id: string;
          interpretation_md: string | null;
          latency_memory_md: string | null;
          metrics_json: Json | null;
          metrics_md: string | null;
          next_experiment_md: string | null;
          parameters_md: string | null;
          repo_name: string | null;
          research_question: string | null;
          results_md: string | null;
          segment_results_md: string | null;
          slug: string;
          status: Database["public"]["Enums"]["experiment_status"];
          title: string;
          treatment: string | null;
          updated_at: string;
          user_id: string;
          visibility: Database["public"]["Enums"]["visibility"];
        };
        Insert: {
          baseline?: string | null;
          branch_ref?: string | null;
          created_at?: string;
          dataset?: string | null;
          failure_cases_md?: string | null;
          fts?: unknown;
          happened_on?: string | null;
          hypothesis?: string | null;
          id?: string;
          interpretation_md?: string | null;
          latency_memory_md?: string | null;
          metrics_json?: Json | null;
          metrics_md?: string | null;
          next_experiment_md?: string | null;
          parameters_md?: string | null;
          repo_name?: string | null;
          research_question?: string | null;
          results_md?: string | null;
          segment_results_md?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["experiment_status"];
          title: string;
          treatment?: string | null;
          updated_at?: string;
          user_id: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Update: {
          baseline?: string | null;
          branch_ref?: string | null;
          created_at?: string;
          dataset?: string | null;
          failure_cases_md?: string | null;
          fts?: unknown;
          happened_on?: string | null;
          hypothesis?: string | null;
          id?: string;
          interpretation_md?: string | null;
          latency_memory_md?: string | null;
          metrics_json?: Json | null;
          metrics_md?: string | null;
          next_experiment_md?: string | null;
          parameters_md?: string | null;
          repo_name?: string | null;
          research_question?: string | null;
          results_md?: string | null;
          segment_results_md?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["experiment_status"];
          title?: string;
          treatment?: string | null;
          updated_at?: string;
          user_id?: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Relationships: [];
      };
      misconception_corrections: {
        Row: {
          can_explain_without_notes: boolean;
          concept_id: string | null;
          confidence: number;
          corrected_on: string;
          corrected_understanding_md: string;
          created_at: string;
          evidence_md: string | null;
          fts: unknown;
          id: string;
          initial_belief_md: string;
          paper_id: string | null;
          updated_at: string;
          user_id: string;
          visibility: Database["public"]["Enums"]["visibility"];
          why_i_believed_md: string | null;
        };
        Insert: {
          can_explain_without_notes?: boolean;
          concept_id?: string | null;
          confidence?: number;
          corrected_on?: string;
          corrected_understanding_md: string;
          created_at?: string;
          evidence_md?: string | null;
          fts?: unknown;
          id?: string;
          initial_belief_md: string;
          paper_id?: string | null;
          updated_at?: string;
          user_id: string;
          visibility?: Database["public"]["Enums"]["visibility"];
          why_i_believed_md?: string | null;
        };
        Update: {
          can_explain_without_notes?: boolean;
          concept_id?: string | null;
          confidence?: number;
          corrected_on?: string;
          corrected_understanding_md?: string;
          created_at?: string;
          evidence_md?: string | null;
          fts?: unknown;
          id?: string;
          initial_belief_md?: string;
          paper_id?: string | null;
          updated_at?: string;
          user_id?: string;
          visibility?: Database["public"]["Enums"]["visibility"];
          why_i_believed_md?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "misconception_corrections_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "concepts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "misconception_corrections_paper_id_fkey";
            columns: ["paper_id"];
            isOneToOne: false;
            referencedRelation: "papers";
            referencedColumns: ["id"];
          },
        ];
      };
      paper_annotations: {
        Row: {
          body_md: string;
          created_at: string;
          fts: unknown;
          id: string;
          kind: Database["public"]["Enums"]["annotation_kind"];
          paper_id: string;
          passage_id: string | null;
          resolved: boolean;
          updated_at: string;
          user_id: string;
          visibility: Database["public"]["Enums"]["visibility"];
        };
        Insert: {
          body_md: string;
          created_at?: string;
          fts?: unknown;
          id?: string;
          kind?: Database["public"]["Enums"]["annotation_kind"];
          paper_id: string;
          passage_id?: string | null;
          resolved?: boolean;
          updated_at?: string;
          user_id: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Update: {
          body_md?: string;
          created_at?: string;
          fts?: unknown;
          id?: string;
          kind?: Database["public"]["Enums"]["annotation_kind"];
          paper_id?: string;
          passage_id?: string | null;
          resolved?: boolean;
          updated_at?: string;
          user_id?: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "paper_annotations_paper_id_fkey";
            columns: ["paper_id"];
            isOneToOne: false;
            referencedRelation: "papers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paper_annotations_passage_id_fkey";
            columns: ["passage_id"];
            isOneToOne: false;
            referencedRelation: "paper_passages";
            referencedColumns: ["id"];
          },
        ];
      };
      paper_concepts: {
        Row: {
          concept_id: string;
          paper_id: string;
          user_id: string;
        };
        Insert: {
          concept_id: string;
          paper_id: string;
          user_id: string;
        };
        Update: {
          concept_id?: string;
          paper_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "paper_concepts_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "concepts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paper_concepts_paper_id_fkey";
            columns: ["paper_id"];
            isOneToOne: false;
            referencedRelation: "papers";
            referencedColumns: ["id"];
          },
        ];
      };
      paper_notes: {
        Row: {
          authorship: Database["public"]["Enums"]["note_authorship"];
          body_md: string;
          created_at: string;
          fts: unknown;
          id: string;
          paper_id: string;
          position: number;
          section_type: Database["public"]["Enums"]["paper_section_type"];
          updated_at: string;
          user_id: string;
          visibility: Database["public"]["Enums"]["visibility"];
        };
        Insert: {
          authorship?: Database["public"]["Enums"]["note_authorship"];
          body_md?: string;
          created_at?: string;
          fts?: unknown;
          id?: string;
          paper_id: string;
          position?: number;
          section_type: Database["public"]["Enums"]["paper_section_type"];
          updated_at?: string;
          user_id: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Update: {
          authorship?: Database["public"]["Enums"]["note_authorship"];
          body_md?: string;
          created_at?: string;
          fts?: unknown;
          id?: string;
          paper_id?: string;
          position?: number;
          section_type?: Database["public"]["Enums"]["paper_section_type"];
          updated_at?: string;
          user_id?: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "paper_notes_paper_id_fkey";
            columns: ["paper_id"];
            isOneToOne: false;
            referencedRelation: "papers";
            referencedColumns: ["id"];
          },
        ];
      };
      paper_passages: {
        Row: {
          ai_model: string | null;
          ai_summary_md: string;
          anchor: string | null;
          created_at: string;
          id: string;
          page_end: number | null;
          page_start: number | null;
          paper_id: string;
          position: number;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          ai_model?: string | null;
          ai_summary_md?: string;
          anchor?: string | null;
          created_at?: string;
          id?: string;
          page_end?: number | null;
          page_start?: number | null;
          paper_id: string;
          position: number;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ai_model?: string | null;
          ai_summary_md?: string;
          anchor?: string | null;
          created_at?: string;
          id?: string;
          page_end?: number | null;
          page_start?: number | null;
          paper_id?: string;
          position?: number;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "paper_passages_paper_id_fkey";
            columns: ["paper_id"];
            isOneToOne: false;
            referencedRelation: "papers";
            referencedColumns: ["id"];
          },
        ];
      };
      paper_relations: {
        Row: {
          created_at: string;
          from_paper_id: string;
          id: string;
          note: string | null;
          relation_kind: Database["public"]["Enums"]["relation_kind"];
          to_paper_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          from_paper_id: string;
          id?: string;
          note?: string | null;
          relation_kind?: Database["public"]["Enums"]["relation_kind"];
          to_paper_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          from_paper_id?: string;
          id?: string;
          note?: string | null;
          relation_kind?: Database["public"]["Enums"]["relation_kind"];
          to_paper_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "paper_relations_from_paper_id_fkey";
            columns: ["from_paper_id"];
            isOneToOne: false;
            referencedRelation: "papers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paper_relations_to_paper_id_fkey";
            columns: ["to_paper_id"];
            isOneToOne: false;
            referencedRelation: "papers";
            referencedColumns: ["id"];
          },
        ];
      };
      paper_suggestions: {
        Row: {
          created_at: string;
          decided_at: string | null;
          id: string;
          kind: Database["public"]["Enums"]["suggestion_kind"];
          paper_id: string;
          payload: Json;
          run_id: string | null;
          status: Database["public"]["Enums"]["suggestion_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["suggestion_kind"];
          paper_id: string;
          payload: Json;
          run_id?: string | null;
          status?: Database["public"]["Enums"]["suggestion_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["suggestion_kind"];
          paper_id?: string;
          payload?: Json;
          run_id?: string | null;
          status?: Database["public"]["Enums"]["suggestion_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "paper_suggestions_paper_id_fkey";
            columns: ["paper_id"];
            isOneToOne: false;
            referencedRelation: "papers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paper_suggestions_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "processing_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      paper_topics: {
        Row: {
          paper_id: string;
          topic_id: string;
          user_id: string;
        };
        Insert: {
          paper_id: string;
          topic_id: string;
          user_id: string;
        };
        Update: {
          paper_id?: string;
          topic_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "paper_topics_paper_id_fkey";
            columns: ["paper_id"];
            isOneToOne: false;
            referencedRelation: "papers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "paper_topics_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      papers: {
        Row: {
          abstract: string | null;
          arxiv_id: string | null;
          authors: string[];
          canonical_url: string | null;
          created_at: string;
          doi: string | null;
          fts: unknown;
          id: string;
          last_read_at: string | null;
          needs_revisit: boolean;
          note_source: string | null;
          organisation: string | null;
          pdf_url: string | null;
          primary_source_verified: boolean;
          priority: number;
          processed_at: string | null;
          processing_error: string | null;
          processing_status: Database["public"]["Enums"]["processing_status"];
          production_evidence: string | null;
          production_relevance: number;
          reading_status: Database["public"]["Enums"]["reading_status"];
          relevance: number;
          relevance_note: string | null;
          slug: string;
          source_input: string | null;
          subtitle: string | null;
          title: string;
          updated_at: string;
          user_id: string;
          venue: string | null;
          verification_status: Database["public"]["Enums"]["verification_status"];
          visibility: Database["public"]["Enums"]["visibility"];
          year: number | null;
        };
        Insert: {
          abstract?: string | null;
          arxiv_id?: string | null;
          authors?: string[];
          canonical_url?: string | null;
          created_at?: string;
          doi?: string | null;
          fts?: unknown;
          id?: string;
          last_read_at?: string | null;
          needs_revisit?: boolean;
          note_source?: string | null;
          organisation?: string | null;
          pdf_url?: string | null;
          primary_source_verified?: boolean;
          priority?: number;
          processed_at?: string | null;
          processing_error?: string | null;
          processing_status?: Database["public"]["Enums"]["processing_status"];
          production_evidence?: string | null;
          production_relevance?: number;
          reading_status?: Database["public"]["Enums"]["reading_status"];
          relevance?: number;
          relevance_note?: string | null;
          slug: string;
          source_input?: string | null;
          subtitle?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
          venue?: string | null;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          visibility?: Database["public"]["Enums"]["visibility"];
          year?: number | null;
        };
        Update: {
          abstract?: string | null;
          arxiv_id?: string | null;
          authors?: string[];
          canonical_url?: string | null;
          created_at?: string;
          doi?: string | null;
          fts?: unknown;
          id?: string;
          last_read_at?: string | null;
          needs_revisit?: boolean;
          note_source?: string | null;
          organisation?: string | null;
          pdf_url?: string | null;
          primary_source_verified?: boolean;
          priority?: number;
          processed_at?: string | null;
          processing_error?: string | null;
          processing_status?: Database["public"]["Enums"]["processing_status"];
          production_evidence?: string | null;
          production_relevance?: number;
          reading_status?: Database["public"]["Enums"]["reading_status"];
          relevance?: number;
          relevance_note?: string | null;
          slug?: string;
          source_input?: string | null;
          subtitle?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
          venue?: string | null;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          visibility?: Database["public"]["Enums"]["visibility"];
          year?: number | null;
        };
        Relationships: [];
      };
      processing_runs: {
        Row: {
          attempt: number;
          created_at: string;
          error: string | null;
          finished_at: string | null;
          id: string;
          model: string | null;
          paper_id: string;
          prompt_version: string | null;
          stage: string | null;
          stages_completed: string[];
          started_at: string | null;
          status: Database["public"]["Enums"]["run_status"];
          updated_at: string;
          usage: Json | null;
          user_id: string;
        };
        Insert: {
          attempt?: number;
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          model?: string | null;
          paper_id: string;
          prompt_version?: string | null;
          stage?: string | null;
          stages_completed?: string[];
          started_at?: string | null;
          status?: Database["public"]["Enums"]["run_status"];
          updated_at?: string;
          usage?: Json | null;
          user_id: string;
        };
        Update: {
          attempt?: number;
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          model?: string | null;
          paper_id?: string;
          prompt_version?: string | null;
          stage?: string | null;
          stages_completed?: string[];
          started_at?: string | null;
          status?: Database["public"]["Enums"]["run_status"];
          updated_at?: string;
          usage?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "processing_runs_paper_id_fkey";
            columns: ["paper_id"];
            isOneToOne: false;
            referencedRelation: "papers";
            referencedColumns: ["id"];
          },
        ];
      };
      radar_candidates: {
        Row: {
          abstract: string | null;
          accepted_paper_id: string | null;
          arxiv_id: string | null;
          created_at: string;
          doi: string | null;
          id: string;
          normalised_title: string;
          provider: string;
          published_on: string | null;
          score: number | null;
          score_breakdown: Json | null;
          status: Database["public"]["Enums"]["radar_status"];
          title: string;
          topics: string[];
          updated_at: string;
          url: string | null;
          user_id: string;
          why_it_matters: string | null;
        };
        Insert: {
          abstract?: string | null;
          accepted_paper_id?: string | null;
          arxiv_id?: string | null;
          created_at?: string;
          doi?: string | null;
          id?: string;
          normalised_title: string;
          provider: string;
          published_on?: string | null;
          score?: number | null;
          score_breakdown?: Json | null;
          status?: Database["public"]["Enums"]["radar_status"];
          title: string;
          topics?: string[];
          updated_at?: string;
          url?: string | null;
          user_id: string;
          why_it_matters?: string | null;
        };
        Update: {
          abstract?: string | null;
          accepted_paper_id?: string | null;
          arxiv_id?: string | null;
          created_at?: string;
          doi?: string | null;
          id?: string;
          normalised_title?: string;
          provider?: string;
          published_on?: string | null;
          score?: number | null;
          score_breakdown?: Json | null;
          status?: Database["public"]["Enums"]["radar_status"];
          title?: string;
          topics?: string[];
          updated_at?: string;
          url?: string | null;
          user_id?: string;
          why_it_matters?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "radar_candidates_accepted_paper_id_fkey";
            columns: ["accepted_paper_id"];
            isOneToOne: false;
            referencedRelation: "papers";
            referencedColumns: ["id"];
          },
        ];
      };
      reading_sessions: {
        Row: {
          continue_md: string | null;
          created_at: string;
          ended_at: string | null;
          id: string;
          minutes: number | null;
          note: string | null;
          occurred_on: string;
          paper_id: string;
          started_at: string | null;
          takeaway_md: string | null;
          user_id: string;
        };
        Insert: {
          continue_md?: string | null;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          minutes?: number | null;
          note?: string | null;
          occurred_on?: string;
          paper_id: string;
          started_at?: string | null;
          takeaway_md?: string | null;
          user_id: string;
        };
        Update: {
          continue_md?: string | null;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          minutes?: number | null;
          note?: string | null;
          occurred_on?: string;
          paper_id?: string;
          started_at?: string | null;
          takeaway_md?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reading_sessions_paper_id_fkey";
            columns: ["paper_id"];
            isOneToOne: false;
            referencedRelation: "papers";
            referencedColumns: ["id"];
          },
        ];
      };
      sources: {
        Row: {
          created_at: string;
          id: string;
          locator: string | null;
          needs_verification: boolean;
          paper_id: string;
          quote_or_claim: string | null;
          source_name: string;
          url: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          locator?: string | null;
          needs_verification?: boolean;
          paper_id: string;
          quote_or_claim?: string | null;
          source_name: string;
          url?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          locator?: string | null;
          needs_verification?: boolean;
          paper_id?: string;
          quote_or_claim?: string | null;
          source_name?: string;
          url?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sources_paper_id_fkey";
            columns: ["paper_id"];
            isOneToOne: false;
            referencedRelation: "papers";
            referencedColumns: ["id"];
          },
        ];
      };
      synthesis_notes: {
        Row: {
          ai_draft_md: string | null;
          approved_at: string | null;
          body_md: string;
          created_at: string;
          fts: unknown;
          id: string;
          kind: Database["public"]["Enums"]["synthesis_kind"];
          period_start: string;
          title: string;
          updated_at: string;
          user_id: string;
          visibility: Database["public"]["Enums"]["visibility"];
        };
        Insert: {
          ai_draft_md?: string | null;
          approved_at?: string | null;
          body_md?: string;
          created_at?: string;
          fts?: unknown;
          id?: string;
          kind: Database["public"]["Enums"]["synthesis_kind"];
          period_start: string;
          title: string;
          updated_at?: string;
          user_id: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Update: {
          ai_draft_md?: string | null;
          approved_at?: string | null;
          body_md?: string;
          created_at?: string;
          fts?: unknown;
          id?: string;
          kind?: Database["public"]["Enums"]["synthesis_kind"];
          period_start?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Relationships: [];
      };
      topics: {
        Row: {
          created_at: string;
          id: string;
          knowledge_gaps_md: string | null;
          name: string;
          overview_md: string | null;
          slug: string;
          synthesis_md: string | null;
          updated_at: string;
          user_id: string;
          visibility: Database["public"]["Enums"]["visibility"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          knowledge_gaps_md?: string | null;
          name: string;
          overview_md?: string | null;
          slug: string;
          synthesis_md?: string | null;
          updated_at?: string;
          user_id: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Update: {
          created_at?: string;
          id?: string;
          knowledge_gaps_md?: string | null;
          name?: string;
          overview_md?: string | null;
          slug?: string;
          synthesis_md?: string | null;
          updated_at?: string;
          user_id?: string;
          visibility?: Database["public"]["Enums"]["visibility"];
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      immutable_array_to_text: { Args: { arr: string[] }; Returns: string };
      search_all: {
        Args: { query: string };
        Returns: {
          excerpt: string;
          id: string;
          kind: string;
          rank: number;
          reading_status: string;
          slug: string;
          title: string;
          topic_names: string[];
          updated_at: string;
        }[];
      };
    };
    Enums: {
      annotation_kind: "note" | "question" | "correction" | "idea";
      experiment_status:
        "proposed" | "implementing" | "running" | "analysing" | "completed" | "abandoned";
      note_authorship: "human" | "ai" | "ai_edited";
      paper_section_type:
        | "summary"
        | "thesis"
        | "problem"
        | "insufficiency"
        | "architecture"
        | "mechanism"
        | "equations"
        | "intuition"
        | "why_it_works"
        | "training_setup"
        | "evaluation"
        | "results"
        | "production_evidence"
        | "serving"
        | "failure_modes"
        | "segment_risks"
        | "relevance_to_me"
        | "implementation_mapping"
        | "experiment_proposal"
        | "misconceptions"
        | "open_questions"
        | "related_papers"
        | "boss_explanation"
        | "sources_to_verify";
      processing_status:
        | "none"
        | "queued"
        | "fetching"
        | "extracting"
        | "summarising"
        | "suggesting"
        | "done"
        | "failed";
      radar_status: "fetched" | "scored" | "in_review" | "accepted" | "dismissed";
      reading_status:
        | "to_read"
        | "queued"
        | "skimmed"
        | "studied_through_guide"
        | "deep_read"
        | "implemented"
        | "revisit";
      relation_kind: "builds_on" | "contrasts_with" | "same_family" | "cites" | "supersedes";
      run_status: "queued" | "running" | "done" | "failed";
      suggestion_kind: "topic" | "concept" | "priority" | "relevance";
      suggestion_status: "proposed" | "accepted" | "rejected";
      synthesis_kind: "weekly" | "monthly";
      verification_status:
        "metadata_only" | "secondary_summary_only" | "primary_opened" | "primary_claims_verified";
      visibility: "private" | "publishable";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
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
    Enums: {
      annotation_kind: ["note", "question", "correction", "idea"],
      experiment_status: [
        "proposed",
        "implementing",
        "running",
        "analysing",
        "completed",
        "abandoned",
      ],
      note_authorship: ["human", "ai", "ai_edited"],
      paper_section_type: [
        "summary",
        "thesis",
        "problem",
        "insufficiency",
        "architecture",
        "mechanism",
        "equations",
        "intuition",
        "why_it_works",
        "training_setup",
        "evaluation",
        "results",
        "production_evidence",
        "serving",
        "failure_modes",
        "segment_risks",
        "relevance_to_me",
        "implementation_mapping",
        "experiment_proposal",
        "misconceptions",
        "open_questions",
        "related_papers",
        "boss_explanation",
        "sources_to_verify",
      ],
      processing_status: [
        "none",
        "queued",
        "fetching",
        "extracting",
        "summarising",
        "suggesting",
        "done",
        "failed",
      ],
      radar_status: ["fetched", "scored", "in_review", "accepted", "dismissed"],
      reading_status: [
        "to_read",
        "queued",
        "skimmed",
        "studied_through_guide",
        "deep_read",
        "implemented",
        "revisit",
      ],
      relation_kind: ["builds_on", "contrasts_with", "same_family", "cites", "supersedes"],
      run_status: ["queued", "running", "done", "failed"],
      suggestion_kind: ["topic", "concept", "priority", "relevance"],
      suggestion_status: ["proposed", "accepted", "rejected"],
      synthesis_kind: ["weekly", "monthly"],
      verification_status: [
        "metadata_only",
        "secondary_summary_only",
        "primary_opened",
        "primary_claims_verified",
      ],
      visibility: ["private", "publishable"],
    },
  },
} as const;
