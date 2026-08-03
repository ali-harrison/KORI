// Supabase database types
// Replace with generated output of: npx supabase gen types typescript --project-id your-project-ref

export type Database = {
  public: {
    Tables: {
      gyms: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          stripe_account_id: string | null;
          stripe_onboarding_complete: boolean;
          gc_organisation_id: string | null;
          gc_access_token: string | null;
          subscription_status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          stripe_account_id?: string | null;
          stripe_onboarding_complete?: boolean;
          gc_organisation_id?: string | null;
          gc_access_token?: string | null;
          subscription_status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          stripe_account_id?: string | null;
          stripe_onboarding_complete?: boolean;
          gc_organisation_id?: string | null;
          gc_access_token?: string | null;
          subscription_status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      plans: {
        Row: {
          id: string;
          gym_id: string;
          name: string;
          description: string | null;
          price: number;
          pricing_model: string;
          billing_interval: string | null;
          term_months: number | null;
          stripe_price_id: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          name: string;
          description?: string | null;
          price: number;
          pricing_model?: string;
          billing_interval?: string | null;
          term_months?: number | null;
          stripe_price_id?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          pricing_model?: string;
          billing_interval?: string | null;
          term_months?: number | null;
          stripe_price_id?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          gym_id: string;
          member_id: string;
          plan_id: string | null;
          amount: number;
          currency: string;
          provider: string;
          provider_payment_id: string | null;
          type: string;
          status: string;
          note: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          member_id: string;
          plan_id?: string | null;
          amount: number;
          currency?: string;
          provider: string;
          provider_payment_id?: string | null;
          type: string;
          status?: string;
          note?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          member_id?: string;
          plan_id?: string | null;
          amount?: number;
          currency?: string;
          provider?: string;
          provider_payment_id?: string | null;
          type?: string;
          status?: string;
          note?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          gym_id: string;
          user_id: string | null;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          plan_id: string | null;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          gc_customer_id: string | null;
          gc_mandate_id: string | null;
          gc_subscription_id: string | null;
          invite_token: string | null;
          invite_sent_at: string | null;
          start_date: string | null;
          next_billing_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          user_id?: string | null;
          first_name: string;
          last_name: string;
          email: string;
          phone?: string | null;
          plan_id?: string | null;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          gc_customer_id?: string | null;
          gc_mandate_id?: string | null;
          gc_subscription_id?: string | null;
          invite_token?: string | null;
          invite_sent_at?: string | null;
          start_date?: string | null;
          next_billing_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          user_id?: string | null;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string | null;
          plan_id?: string | null;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          gc_customer_id?: string | null;
          gc_mandate_id?: string | null;
          gc_subscription_id?: string | null;
          invite_token?: string | null;
          invite_sent_at?: string | null;
          start_date?: string | null;
          next_billing_date?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      contracts: {
        Row: {
          id: string;
          gym_id: string;
          member_id: string;
          template_url: string | null;
          signed_at: string | null;
          pdf_url: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          member_id: string;
          template_url?: string | null;
          signed_at?: string | null;
          pdf_url?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          member_id?: string;
          template_url?: string | null;
          signed_at?: string | null;
          pdf_url?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
