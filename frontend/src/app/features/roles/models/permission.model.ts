export interface Permission {
  id: number;
  code: string;
  name: string;
  description: string | null;
  created_at?: string;
}
