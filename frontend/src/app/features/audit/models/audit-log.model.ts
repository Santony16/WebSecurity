export interface AuditLog {
  id: number;
  user_id: number | null;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  route: string;
  method: string;
  ip_address: string | null;
  user_agent: string | null;
  status_code: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditFilters {
  event_type?: string;
  user_id?: number;
  date_from?: string;
  date_to?: string;
  limit?: number;
}
