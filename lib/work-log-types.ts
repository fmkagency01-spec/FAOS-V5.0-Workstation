/** FAOS / BulletsEye Daily Work Log — team + agent day-to-day tracking. */

export type ProjectHealth = "on_track" | "at_risk" | "blocked";

export type WorkLogInProgressItem = {
  name: string;
  progress_pct: number;
};

export type DailyWorkLog = {
  id: string;
  /** ISO date YYYY-MM-DD (local work day) */
  log_date: string;
  member_name: string;
  member_role: string;
  /** Who submitted (session username when available) */
  submitted_by?: string;
  tasks_completed: string[];
  tasks_in_progress: WorkLogInProgressItem[];
  blockers: string[];
  next_day_plan: string[];
  project_health: ProjectHealth;
  /** Optional notes / backend process notes */
  backend_notes?: string;
  /** Linked agent/task ids observed that day */
  agent_activity_ids?: string[];
  created_at: string;
  updated_at: string;
};

export type DailyWorkLogCreateInput = {
  log_date?: string;
  member_name: string;
  member_role?: string;
  submitted_by?: string;
  tasks_completed?: string[];
  tasks_in_progress?: WorkLogInProgressItem[];
  blockers?: string[];
  next_day_plan?: string[];
  project_health?: ProjectHealth;
  backend_notes?: string;
  agent_activity_ids?: string[];
};

export type DailyWorkLogUpdateInput = Partial<DailyWorkLogCreateInput>;

export type WorkLogDashboardStats = {
  total_today: number;
  on_track: number;
  at_risk: number;
  blocked: number;
  members_logged_today: number;
  avg_in_progress_pct: number;
};
