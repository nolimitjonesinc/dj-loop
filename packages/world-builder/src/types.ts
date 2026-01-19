/**
 * World Builder Types
 *
 * These types define worlds and characters for the overnight generation system.
 * Characters use the same 8-layer psychology system as Loomiverse.
 */

// ============================================
// WORLD TEMPLATE
// ============================================

export interface WorldTemplate {
  id: string;
  name: string;
  description: string;

  // Core world settings (maps to Loomiverse Layer 1)
  era: string;                    // "Far Future", "Victorian", "Fantasy Medieval", etc.
  tech_level: string;             // "post_scarcity", "industrial", "medieval_magic", etc.

  // Geography
  setting_type: 'city' | 'town' | 'region' | 'station' | 'colony';
  neighborhoods: Neighborhood[];

  // Social structure
  factions: Faction[];
  social_classes: SocialClass[];

  // World history (feeds into character backstories)
  key_events: WorldEvent[];

  // Cultural defaults
  cultural_groups: CulturalGroup[];
  dominant_values: string[];      // "collectivism", "individualism", "honor", etc.

  // Generation settings
  character_count: number;        // How many characters to generate
  relationship_density: 'sparse' | 'normal' | 'dense';  // How connected characters are

  // Metadata
  created_at: string;
  status: 'draft' | 'approved' | 'generating' | 'completed' | 'failed';
}

export interface Neighborhood {
  name: string;
  description: string;
  social_class: string;           // "upper", "middle", "lower", "mixed"
  atmosphere: string;             // Maps to Loomiverse "atmospheric conditions"
  typical_families: string[];     // "corporate families", "working class", etc.
}

export interface Faction {
  name: string;
  description: string;
  values: string[];
  conflicts_with: string[];       // Other faction names
  typical_roles: string[];        // Jobs/positions within faction
}

export interface SocialClass {
  name: string;
  description: string;
  economic_level: number;         // 1-10
  mobility: number;               // 0-1, how easy to move up/down
  typical_professions: string[];
}

export interface WorldEvent {
  name: string;
  description: string;
  years_ago: number;              // How long ago it happened
  impact: 'minor' | 'major' | 'catastrophic';
  affected_groups: string[];      // Faction/class names most affected
  trauma_type?: string;           // "war", "disaster", "oppression", etc.
}

export interface CulturalGroup {
  name: string;
  description: string;
  values: {
    collectivism: number;         // 0-1
    family_obligation: number;    // 0-1
    respect_for_elders: number;   // 0-1
  };
  typical_belonging: 'insider' | 'conditional_insider' | 'outsider' | 'targeted';
  historical_trauma?: string;
}

// ============================================
// CHARACTER (Generated from World)
// ============================================

export interface WorldCharacter {
  id: string;
  world_id: string;

  // Basic info
  name: string;
  age: number;
  gender: string;

  // World placement
  neighborhood: string;
  faction?: string;
  social_class: string;
  profession: string;

  // The 8 Psychological Layers (from Loomiverse)
  psychology: CharacterPsychology;

  // Simulation results
  life_events: LifeEvent[];
  core_memories: CoreMemory[];

  // Elaborated content (AI-generated)
  elaborations?: CharacterElaborations;

  // Relationships to other world characters
  relationships: CharacterRelationship[];

  // Metadata
  created_at: string;
  generation_phase: 'seed' | 'simulated' | 'elaborated' | 'complete';
}

export interface CharacterPsychology {
  // Layer 1: World Context (inherited from WorldTemplate)
  world_context: {
    era: string;
    region: string;
    setting: string;
    historical_events: string[];
  };

  // Layer 2: Cultural Identity
  cultural_identity: {
    group: string;
    subgroup?: string;
    belonging: string;
    identity_relationship: string;  // "proud_activist", "conflicted_assimilating", etc.
  };

  // Layer 3: Generational Echoes
  generational_echoes: {
    family_myth: string;
    unmourned_loss?: string;
    invisible_loyalty?: string;
    family_secret?: string;
    grandparent_experience?: string;
  };

  // Layer 4: Family Structure
  family: {
    structure: string;            // "nuclear", "single_parent", "extended", etc.
    birth_order: string;
    socioeconomic: string;
    mother?: ParentProfile;
    father?: ParentProfile;
    siblings: number;
  };

  // Layer 5: Atmospheric Conditions
  atmospheric_conditions: {
    emotional_climate: string;    // "warm_secure", "cold_critical", "chaotic_violent"
    unspoken_rules: string[];
    survival_requirement: string;
    base_threat_level: number;    // 0-1
  };

  // Layer 6: Biology
  biology: {
    temperament: string;
    sensitivity: number;          // 0-1
    resilience: number;           // 0-1
    energy_level: string;
    appearance_trajectory: string;
  };

  // Layer 7: Embodiment
  embodiment: {
    body_relationship: string;    // "comfortable_integrated", "dissociated_disconnected"
    movement_quality: string;
    somatic_patterns: string[];
  };

  // Layer 8: Attachment
  attachment: {
    style: string;                // "secure", "anxious", "avoidant", "disorganized"
    subtype: string;
    core_beliefs: {
      self: string[];
      others: string[];
      world: string[];
    };
    defense_mechanisms: string[];
    coping_style: string;         // "fight", "flight", "freeze", "fawn"
  };
}

export interface ParentProfile {
  wound?: string;
  wound_category?: string;
  coping?: string;
  present: boolean;
}

export interface LifeEvent {
  id: string;
  age: number;
  domain: string;                 // "family", "peer", "world", "body"
  type: string;                   // "parent_praise", "bullied", etc.
  valence: 'positive' | 'negative' | 'traumatic' | 'neutral';
  severity: number;               // 0-1
  belief_impacts: Record<string, number>;  // Which beliefs changed
}

export interface CoreMemory {
  event_id: string;
  age: number;
  type: string;
  severity: number;
  is_elaborated: boolean;
  elaboration?: {
    what_happened: string;
    attribution: string;
    somatic?: string;
  };
}

export interface CharacterElaborations {
  // Detailed family
  mother_detailed?: {
    name: string;
    wound_story: string;
    provides: string[];
    fails_to_provide: string[];
  };
  father_detailed?: {
    name: string;
    wound_story: string;
    provides: string[];
    fails_to_provide: string[];
  };

  // Extended psychology
  belief_schemas?: BeliefSchema[];
  dialectical_tensions?: DialecticalTension[];
  contextual_selves?: ContextualSelves;
  desire_structure?: DesireStructure;

  // Voice and appearance
  visual_description?: string;
  voice_samples?: string[];
  story_hooks?: string[];
}

export interface BeliefSchema {
  belief: string;
  triggers: string[];
  evidence_library: string[];
  protective_behaviors: string[];
}

export interface DialecticalTension {
  belief_a: string;
  belief_b: string;
  which_wins_when: string;
}

export interface ContextualSelves {
  with_safe_people: string;
  with_threatening_people: string;
  under_stress: string;
  best_self: string;
}

export interface DesireStructure {
  surface_wants: string[];
  underlying_needs: string[];
  forbidden_desires: string[];
  what_they_need_to_heal: string;
}

export interface CharacterRelationship {
  target_character_id: string;
  type: string;                   // "family", "friend", "rival", "lover", "colleague"
  subtype?: string;               // "sibling", "parent", "best_friend", etc.
  valence: 'positive' | 'negative' | 'ambivalent';
  intensity: number;              // 0-1
  history?: string;               // Brief description of relationship history
}

// ============================================
// GENERATION JOB
// ============================================

export interface WorldGenerationJob {
  id: string;
  world_id: string;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed';
  progress: number;               // 0-100
  current_phase: string;
  characters_generated: number;
  characters_total: number;
  current_character?: string;     // Name of character being generated
  logs: string[];
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}
