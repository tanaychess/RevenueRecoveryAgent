/**
 * API client for Razorpay AI Revenue Recovery Agent.
 */

import {
  AuditEntry,
  BatchMetrics,
  ChatReplyResponse,
  CustomFailurePayload,
  HealthInfo,
  RoiAnalytics,
  ScenarioPayload,
} from "./types";

export * from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

function getAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  if (ADMIN_KEY) {
    return { ...headers, "X-Admin-Key": ADMIN_KEY };
  }
  return headers;
}

export async function getHealth(): Promise<HealthInfo> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function processBatch(): Promise<{
  processed: number;
  metrics: BatchMetrics;
  entries: AuditEntry[];
}> {
  const res = await fetch(`${API_BASE}/api/process-batch`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`process-batch failed: ${res.status}`);
  return res.json();
}

export async function getMetrics(): Promise<
  | { batch_processed: false; message: string }
  | { batch_processed: true; metrics: BatchMetrics }
> {
  const res = await fetch(`${API_BASE}/api/metrics`);
  if (!res.ok) throw new Error(`metrics failed: ${res.status}`);
  return res.json();
}

export async function getRoiAnalytics(): Promise<RoiAnalytics> {
  const res = await fetch(`${API_BASE}/api/metrics/roi`);
  if (!res.ok) throw new Error(`ROI fetch failed: ${res.status}`);
  return res.json();
}

export async function getAudit(
  limit = 200,
  offset = 0,
  search = "",
  status = "",
  payment_method = ""
): Promise<{ total: number; entries: AuditEntry[] }> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (search) params.append("search", search);
  if (status) params.append("status", status);
  if (payment_method) params.append("payment_method", payment_method);

  const res = await fetch(`${API_BASE}/api/audit?${params.toString()}`);
  if (!res.ok) throw new Error(`audit failed: ${res.status}`);
  return res.json();
}

export async function resolvePayment(
  paymentId: string,
  amountPaise?: number,
  channel = "customer_payment_link"
): Promise<{ status: string; message: string; payment_id: string; amount_recovered_inr: number }> {
  const res = await fetch(`${API_BASE}/api/simulate/resolve-payment`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      payment_id: paymentId,
      recovered_amount_paise: amountPaise,
      channel,
    }),
  });
  if (!res.ok) throw new Error(`resolve-payment failed: ${res.status}`);
  return res.json();
}

export async function sendChatReply(
  paymentId: string,
  customerMessage: string,
  language = "Hinglish",
  customerName = "Rohan Mehta",
  amountInr = 1499.0,
  customerTier = "VIP",
  conversationHistory: { sender: string; message: string }[] = []
): Promise<ChatReplyResponse> {
  const res = await fetch(`${API_BASE}/api/chat/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payment_id: paymentId,
      customer_message: customerMessage,
      language,
      customer_name: customerName,
      amount_inr: amountInr,
      customer_tier: customerTier,
      conversation_history: conversationHistory,
    }),
  });
  if (!res.ok) throw new Error(`chat-reply failed: ${res.status}`);
  return res.json();
}

export async function simulateCustomFailure(payload: CustomFailurePayload): Promise<any> {
  const res = await fetch(`${API_BASE}/api/simulate/custom-failure`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`simulate-failure failed: ${res.status}`);
  return res.json();
}

export async function simulateScenario(payload: ScenarioPayload): Promise<any> {
  const res = await fetch(`${API_BASE}/api/simulate/scenario`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`simulate-scenario failed: ${res.status}`);
  return res.json();
}

export async function getRulesConfig(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/config/rules`);
  if (!res.ok) throw new Error(`get-config failed: ${res.status}`);
  return res.json();
}

export async function updateRulesConfig(config: any): Promise<any> {
  const res = await fetch(`${API_BASE}/api/config/rules`, {
    method: "PUT",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `update-config failed: ${res.status}`);
  }
  return res.json();
}

export async function resetRulesConfig(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/config/rules/reset`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`reset-rules-config failed: ${res.status}`);
  return res.json();
}

export async function resetBatch(): Promise<void> {
  await fetch(`${API_BASE}/api/reset`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
}

export function formatInr(paise: number): string {
  const rupees = (paise || 0) / 100;
  return formatRupees(rupees);
}

export function formatRupees(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees || 0);
}
