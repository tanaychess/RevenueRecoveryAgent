/**
 * TypeScript Data Models for Razorpay AI Revenue Recovery Dashboard.
 */

export interface PipelineFunnelMetrics {
  total_detected: number;
  total_diagnosed: number;
  scheduled_clearing: number;
  active_recovery_actions: number;
  recovered_successfully: number;
  quarantined_or_stopped: number;
  escalated_to_ops: number;
}

export interface BatchMetrics {
  batch_size: number;
  total_amount_at_risk_paise: number;
  total_amount_recovered_paise: number;
  recovery_rate: number;
  records_recovered: number;
  records_escalated: number;
  records_stopped: number;
  records_exhausted: number;
  records_scheduled: number;
  root_cause_breakdown: Record<string, number>;
  action_breakdown: Record<string, number>;
  channel_breakdown: Record<string, number>;
  false_escalation_estimate: number;
  averted_churn_inr: number;
  estimated_roi_multiple: number;
  funnel?: PipelineFunnelMetrics;
}

export interface TimelineEvent {
  timestamp_iso: string;
  event_type: string;
  title: string;
  description: string;
  actor: string;
  badge_variant: string;
}

export interface AuditEntry {
  id: number;
  payment_id: string;
  customer_id: string;
  customer_name_masked: string;
  customer_phone_masked: string;
  amount_paise: number;
  payment_method: string;
  bank_name?: string;
  customer_tier?: string;
  root_cause: string;
  confidence: number;
  reasoning: string;
  evidence?: string[];
  action: string;
  action_detail: string;
  success: boolean;
  amount_recovered_paise: number;
  status: string;
  stop_condition_triggered: string | null;
  compliance_tags: string[];
  payment_link?: string;
  upi_intent_uri?: string;
  offer_discount_pct?: number;
  attempt_count?: number;
  max_attempts?: number;
  timeline?: TimelineEvent[];
  timestamp: string;
}

export interface RoiAnalytics {
  total_at_risk_inr: number;
  recovered_inr: number;
  naive_benchmark_inr: number;
  net_lift_inr: number;
  lift_multiplier: number;
  churn_reduction_pct: number;
  annualized_projected_savings_inr: number;
}

export interface HealthInfo {
  status: string;
  llm_provider: string;
  gemini_model: string | null;
  llm_enabled: boolean;
  llm_last_check?: string;
  razorpay_live_mode: boolean;
  compliance_engine: string;
  runtime_telemetry?: {
    total_requests_processed: number;
    total_recovered_paise_lifetime: number;
    last_batch_run_at: any;
  };
}

export interface ChatReplyResponse {
  payment_id: string;
  agent_reply: string;
  intent_detected: string;
  action_taken: string;
  quick_replies: string[];
  updated_status: string;
  payment_link?: string;
  upi_intent_uri?: string;
  applied_discount_pct?: number;
  language_used?: string;
  frustration_level?: string;
  reasoning_summary?: string;
}

export interface CustomFailurePayload {
  customer_name: string;
  customer_phone: string;
  amount_inr: number;
  payment_method: string;
  bank_name: string;
  failure_code: string;
  failure_message: string;
  customer_tier: string;
}

export interface ScenarioPayload {
  scenario_type: "mass_bank_outage" | "salary_day_surge" | "card_token_expiry";
  bank_name: string;
  count: number;
}
