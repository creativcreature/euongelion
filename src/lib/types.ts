// Pathway types
export type Pathway = 'Sleep' | 'Awake' | 'Shepherd';

// Module data types
export interface ScriptureData {
  reference: string;
  translation: string;
  text: string;
  emphasis?: string[];
}

export interface VocabData {
  language: 'hebrew' | 'greek' | 'latin';
  word: string;
  transliteration: string;
  pronunciation: string;
  strongs: string;
  definition: string;
  root_meaning: string;
  usage_note: string;
}

export interface TeachingData {
  content: string;
  pardes_layer?: 'peshat' | 'remez' | 'derash' | 'sod';
}

export interface InsightData {
  text: string;
}

export interface StoryData {
  title?: string;
  content: string;
}

export interface ReflectionData {
  question: string;
  prompt_text?: string;
  allow_save?: boolean;
}

export interface PrayerData {
  title?: string;
  text: string;
  scripture_echo?: string;
}

export interface TakeawayData {
  title?: string;
  text: string;
  action?: string;
}

export interface BridgeData {
  ancient: string;
  modern: string;
  connection: string;
  question?: string;
}

export interface ComprehensionOption {
  text: string;
  correct: boolean;
}

export interface ComprehensionData {
  question: string;
  options: ComprehensionOption[];
  explanation: string;
}

export interface InteractiveData {
  interaction_type: string;
  prompt: string;
  options: string[];
  follow_up?: string;
}

export interface ResourceData {
  title: string;
  url?: string;
  description?: string;
  type?: string;
}

// Union type for all module data
export type ModuleData =
  | ScriptureData
  | VocabData
  | TeachingData
  | InsightData
  | StoryData
  | ReflectionData
  | PrayerData
  | TakeawayData
  | BridgeData
  | ComprehensionData
  | InteractiveData
  | ResourceData;

// Module types (21 total: 18 content + 3 game)
export type ModuleType =
  // Content modules (18)
  | 'scripture'
  | 'teaching'
  | 'vocab'
  | 'story'
  | 'insight'
  | 'chronology'
  | 'geography'
  | 'profile'
  | 'bridge'
  | 'visual'
  | 'art'
  | 'voice'
  | 'comprehension'
  | 'reflection'
  | 'interactive'
  | 'takeaway'
  | 'resource'
  | 'prayer'
  // Game modules (3)
  | 'match'
  | 'order'
  | 'reveal';

// Module with type and data
export interface Module {
  type: ModuleType;
  data: ModuleData;
}

// Day structure
export interface Day {
  day_number: number;
  title: string;
  subtitle?: string;
  chiasm_position?: string;
  modules: Module[];
}

// Series structure
export interface Series {
  slug: string;
  title: string;
  subtitle?: string;
  pathway: Pathway;
  day_count: number;
  ecclesiastes_connection?: string;
  gospel_presentation?: string;
  core_theme?: string;
  emotional_tones?: string[];
  life_circumstances?: string[];
  target_audience?: string[];
  soul_audit_keywords?: string[];
  days: Day[];
}
