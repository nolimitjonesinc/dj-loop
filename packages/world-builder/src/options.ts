/**
 * Character Generation Options
 *
 * Ported from Loomiverse's characterOptions.js
 * These provide the building blocks for the 8-layer psychology system.
 */

// ============================================
// ATTACHMENT STYLES
// ============================================

export const ATTACHMENT_STYLES = {
  secure: {
    description: "Comfortable with intimacy and independence",
    subtypes: ["stable_secure", "earned_secure"]
  },
  anxious: {
    description: "Fears abandonment, needs constant reassurance",
    subtypes: ["anxious_preoccupied", "anxious_dependent", "anxious_clingy", "anxious_jealous"]
  },
  avoidant: {
    description: "Uncomfortable with closeness, values independence",
    subtypes: ["avoidant_dismissive", "avoidant_fearful", "avoidant_counter_dependent", "avoidant_self_sufficient"]
  },
  disorganized: {
    description: "Caregiver was source of both comfort and fear",
    subtypes: ["disorganized_chaotic", "disorganized_frozen", "disorganized_controlling", "disorganized_dissociative"]
  }
};

// ============================================
// EMOTIONAL CLIMATES
// ============================================

export const EMOTIONAL_CLIMATES: Record<string, { description: string; base_threat: number }> = {
  warm_secure: { description: "Genuine warmth, safety, attunement", base_threat: 0.1 },
  warm_chaotic: { description: "Loving but disorganized, unpredictable positive attention", base_threat: 0.25 },
  warm_smothering: { description: "Intense love that doesn't allow separation", base_threat: 0.3 },
  functional_distant: { description: "Needs met but little emotional connection", base_threat: 0.3 },
  performative: { description: "Appears warm publicly, cold privately", base_threat: 0.4 },
  transactional: { description: "Love conditional on behavior/achievement", base_threat: 0.4 },
  cold_efficient: { description: "Emotionless but functional", base_threat: 0.45 },
  cold_critical: { description: "Constant criticism, nothing good enough", base_threat: 0.55 },
  cold_withholding: { description: "Punishment through silence and withdrawal", base_threat: 0.5 },
  tense_waiting: { description: "Always waiting for the other shoe to drop", base_threat: 0.6 },
  tense_walking_eggshells: { description: "One wrong move triggers explosion", base_threat: 0.65 },
  chaotic_unpredictable: { description: "No pattern, anything can happen", base_threat: 0.7 },
  chaotic_violent: { description: "Regular outbursts, physical danger", base_threat: 0.8 },
  anxious_constant: { description: "Pervasive worry, catastrophizing", base_threat: 0.55 },
  depressed: { description: "Heavy, hopeless, low energy", base_threat: 0.5 },
  terrifying: { description: "Active danger, fear dominant", base_threat: 0.85 },
  numb: { description: "No emotion at all, dissociated", base_threat: 0.55 }
};

// ============================================
// PARENT WOUNDS
// ============================================

export const PARENT_WOUNDS = {
  abandonment: [
    "abandoned_by_parent_childhood",
    "abandoned_by_parent_adolescence",
    "parent_chose_new_family",
    "parent_died_suddenly",
    "parent_incarcerated",
    "parent_emotionally_absent_while_present"
  ],
  neglect: [
    "emotional_neglect_self_reliant",
    "physical_neglect_survival_mode",
    "attention_neglect_invisible",
    "affection_neglect_touch_starved",
    "validation_neglect_unseen"
  ],
  abuse: [
    "physical_abuse_violent",
    "emotional_abuse_criticism",
    "emotional_abuse_manipulation",
    "verbal_abuse_degradation"
  ],
  inadequacy: [
    "never_good_enough_perfectionist",
    "never_good_enough_golden_sibling",
    "wrong_gender_disappointment"
  ],
  parentification: [
    "parentified_raised_siblings",
    "parentified_emotional_spouse",
    "parentified_caretaker_ill_parent",
    "parentified_protector_violence"
  ],
  dysfunction: [
    "addiction_in_family",
    "mental_illness_in_family",
    "domestic_violence_witnessed",
    "extreme_poverty"
  ]
};

// ============================================
// FAMILY MYTHS
// ============================================

export const FAMILY_MYTHS = [
  "We are survivors — we always make it through",
  "We came from nothing and built this",
  "Education is the only way out",
  "Hard work solves everything",
  "Don't trust anyone outside the family",
  "Family is everything",
  "We don't talk about feelings",
  "What happens here stays here",
  "Second place is first loser",
  "We're cursed",
  "Good things don't last for us",
  "We're not like other families"
];

// ============================================
// CORE BELIEFS
// ============================================

export const CORE_BELIEFS_SELF = [
  "I am fundamentally flawed",
  "I am unlovable as I am",
  "I am worthy of love",
  "I am only lovable when I perform",
  "I am a burden to others",
  "I am too much",
  "I am not enough",
  "I am invisible",
  "I don't matter",
  "I can handle anything",
  "I am helpless",
  "I can only rely on myself",
  "I am special/different",
  "I am a good person",
  "I am a bad person",
  "I deserve happiness",
  "I don't deserve happiness"
];

export const CORE_BELIEFS_OTHERS = [
  "Others can be trusted",
  "Others cannot be trusted",
  "Trust will be betrayed",
  "Others will be there when needed",
  "Others will disappoint",
  "Others will abandon me",
  "Others are safe",
  "Others are dangerous",
  "Others accept me as I am",
  "Others judge me constantly",
  "Others don't understand me",
  "I matter to others",
  "Others don't care about me"
];

export const CORE_BELIEFS_WORLD = [
  "The world is safe",
  "The world is dangerous",
  "The world is fair",
  "The world is unfair",
  "I can control my destiny",
  "I have no control",
  "Life has meaning",
  "Life is meaningless",
  "Things can get better",
  "Things never change",
  "Love is real",
  "Love is a lie"
];

// ============================================
// DEFENSE MECHANISMS
// ============================================

export const DEFENSE_MECHANISMS = {
  primitive: ["denial", "projection", "splitting", "dissociation", "acting_out", "regression"],
  neurotic: ["repression", "displacement", "intellectualization", "rationalization", "reaction_formation"],
  mature: ["sublimation", "humor", "altruism", "suppression", "anticipation", "acceptance"]
};

// ============================================
// COPING STYLES
// ============================================

export const COPING_STYLES = {
  fight: ["confrontation", "competition", "dominance", "control_seeking", "perfectionism"],
  flight: ["avoidance", "distraction", "substance_use", "workaholism", "isolation"],
  freeze: ["paralysis", "procrastination", "shutdown", "numbness", "depersonalization"],
  fawn: ["people_pleasing", "over_apologizing", "anticipating_needs", "self_erasure"]
};

// ============================================
// BODY RELATIONSHIPS
// ============================================

export const BODY_RELATIONSHIPS = [
  "comfortable_integrated",
  "instrumental_tool",
  "adversarial_enemy",
  "dissociated_disconnected",
  "hyperaware_monitoring",
  "shameful_source",
  "proud_source_of_power",
  "vulnerable_fragile",
  "neglected_ignored"
];

// ============================================
// IDENTITY RELATIONSHIPS
// ============================================

export const IDENTITY_RELATIONSHIPS = [
  "proud_activist",
  "proud_private",
  "comfortable_integrated",
  "conflicted_assimilating",
  "conflicted_rejecting",
  "ashamed_hiding",
  "exploring_curious",
  "disconnected_ignorant",
  "reclaiming_returning"
];

// ============================================
// EVENT TEMPLATES
// ============================================

export const EVENT_TEMPLATES = {
  family: {
    positive: [
      "parent_praise", "parent_teaches", "defended_by_parent",
      "family_celebration", "parent_protection", "sibling_support"
    ],
    negative: [
      "parent_criticism", "parent_absent", "parent_distant",
      "parental_conflict", "favoritism_shown", "broken_promise",
      "comparison_to_sibling", "family_financial_stress"
    ],
    traumatic: [
      "physical_abuse", "emotional_abuse", "neglect_severe",
      "witnessed_domestic_violence", "parent_death", "sibling_death",
      "parent_addiction_exposed", "abandonment"
    ]
  },
  peer: {
    positive: [
      "friendship_formed", "defended_by_peer", "group_acceptance",
      "first_crush", "best_friend", "team_success"
    ],
    negative: [
      "betrayal", "exclusion", "bullied", "romantic_rejection",
      "humiliated_publicly", "friendship_ended"
    ],
    traumatic: [
      "severe_bullying", "assault_by_peer", "witnessed_peer_death"
    ]
  },
  world: {
    positive: [
      "positive_teacher", "mentor_found", "talent_recognized",
      "community_belonging", "achievement_external", "helping_others"
    ],
    negative: [
      "negative_teacher", "institutional_failure", "discrimination_experienced",
      "unfair_punishment", "public_failure", "authority_abuse"
    ],
    traumatic: [
      "violence_witnessed", "violence_victim", "natural_disaster",
      "war_exposure", "accident_severe", "crime_victim"
    ]
  },
  body: {
    positive: ["discovered_strength", "athletic_achievement", "appearance_admired"],
    negative: ["illness", "injury", "appearance_mocked", "body_shame_event"],
    traumatic: ["serious_illness", "serious_injury", "hospitalization", "chronic_condition_onset"]
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function pickRandomFromObject<T>(obj: Record<string, T[]>): T {
  const allItems = Object.values(obj).flat();
  return pickRandom(allItems);
}

export function weightedRandom(weights: Record<string, number>): string {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;

  for (const [key, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return key;
  }

  return Object.keys(weights)[0];
}
