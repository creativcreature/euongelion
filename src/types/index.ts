// Core types for EUONGELION

export interface Devotional {
  day: number;
  title: string;
  subtitle?: string;
  slug: string;
  modules?: any[];
  chiasm_position?: string;
}

export interface Series {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  pathway: string;
  day_count: number;
  devotionals?: Devotional[];
  tags?: string[];
}

export interface SoulAuditQuestion {
  id: string;
  text: string;
  category: string;
}

export interface SoulAuditAnswer {
  question_id: string;
  answer: number;
}

export interface SoulAuditResult {
  category: string;
  score: number;
  total: number;
  percentage: number;
}

export interface UserProgress {
  user_id: string;
  series_slug: string;
  day_number: number;
  completed: boolean;
  completed_at?: Date;
}

export interface Bookmark {
  user_id: string;
  series_slug: string;
  day_number?: number;
  created_at: Date;
}

export interface Note {
  id: string;
  user_id: string;
  series_slug: string;
  day_number?: number;
  content: string;
  created_at: Date;
  updated_at: Date;
}
