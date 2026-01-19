/**
 * Character Generator
 *
 * Generates deeply layered characters using the 8-layer psychology system.
 * Each character is shaped by their world context.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  WorldTemplate,
  WorldCharacter,
  CharacterPsychology,
  LifeEvent,
  CoreMemory,
  CharacterRelationship,
  ParentProfile
} from './types';
import {
  ATTACHMENT_STYLES,
  EMOTIONAL_CLIMATES,
  PARENT_WOUNDS,
  FAMILY_MYTHS,
  CORE_BELIEFS_SELF,
  CORE_BELIEFS_OTHERS,
  CORE_BELIEFS_WORLD,
  DEFENSE_MECHANISMS,
  COPING_STYLES,
  BODY_RELATIONSHIPS,
  IDENTITY_RELATIONSHIPS,
  EVENT_TEMPLATES,
  pickRandom,
  pickRandomFromObject,
  weightedRandom
} from './options';

// ============================================
// CHARACTER GENERATOR CLASS
// ============================================

export class CharacterGenerator {
  private world: WorldTemplate;
  private anthropic: Anthropic;

  constructor(world: WorldTemplate, apiKey?: string) {
    this.world = world;
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
  }

  /**
   * Generate a single character seed (instant, no AI)
   */
  generateSeed(): Partial<WorldCharacter> {
    const id = `chr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const neighborhood = pickRandom(this.world.neighborhoods);
    const faction = this.world.factions.length > 0
      ? pickRandom(this.world.factions)
      : undefined;
    const socialClass = pickRandom(this.world.social_classes);
    const culturalGroup = pickRandom(this.world.cultural_groups);

    // Generate psychology based on world constraints
    const psychology = this.generatePsychology(neighborhood, socialClass, culturalGroup);

    // Generate age (18-65 for adults)
    const age = 18 + Math.floor(Math.random() * 47);

    // Gender distribution
    const gender = Math.random() > 0.5 ? 'female' : 'male';

    return {
      id,
      world_id: this.world.id,
      age,
      gender,
      neighborhood: neighborhood.name,
      faction: faction?.name,
      social_class: socialClass.name,
      profession: pickRandom(socialClass.typical_professions),
      psychology,
      life_events: [],
      core_memories: [],
      relationships: [],
      created_at: new Date().toISOString(),
      generation_phase: 'seed'
    };
  }

  /**
   * Generate the 8-layer psychology
   */
  private generatePsychology(
    neighborhood: WorldTemplate['neighborhoods'][0],
    socialClass: WorldTemplate['social_classes'][0],
    culturalGroup: WorldTemplate['cultural_groups'][0]
  ): CharacterPsychology {
    // Layer 1: World Context (from world template)
    const world_context = {
      era: this.world.era,
      region: this.world.name,
      setting: neighborhood.name,
      historical_events: this.world.key_events
        .filter(e => e.impact !== 'minor')
        .map(e => e.name)
    };

    // Layer 2: Cultural Identity
    const cultural_identity = {
      group: culturalGroup.name,
      belonging: culturalGroup.typical_belonging,
      identity_relationship: pickRandom(IDENTITY_RELATIONSHIPS)
    };

    // Layer 3: Generational Echoes
    const relevantEvent = this.world.key_events.find(e =>
      e.years_ago > 20 && e.years_ago < 80
    );
    const generational_echoes = {
      family_myth: pickRandom(FAMILY_MYTHS),
      grandparent_experience: relevantEvent
        ? `Lived through ${relevantEvent.name}`
        : undefined,
      unmourned_loss: Math.random() > 0.6 ? undefined : pickRandom([
        "homeland_left_behind",
        "dreams_sacrificed_for_survival",
        "family_member_lost"
      ]),
      invisible_loyalty: Math.random() > 0.5 ? undefined : pickRandom([
        "must_succeed_to_justify_sacrifice",
        "must_not_surpass_parent",
        "must_be_the_caretaker"
      ])
    };

    // Layer 4: Family Structure
    const hasWound = Math.random() > 0.3; // 70% have some wound
    const woundCategory = hasWound
      ? pickRandom(Object.keys(PARENT_WOUNDS) as (keyof typeof PARENT_WOUNDS)[])
      : null;

    const family = {
      structure: pickRandom(["nuclear", "single_parent", "extended", "blended", "absent_parent"]),
      birth_order: pickRandom(["only", "eldest", "middle", "youngest"]),
      socioeconomic: socialClass.name,
      mother: this.generateParent(woundCategory),
      father: this.generateParent(woundCategory),
      siblings: Math.floor(Math.random() * 4)
    };

    // Layer 5: Atmospheric Conditions
    // Influenced by neighborhood atmosphere
    const climateOptions = Object.keys(EMOTIONAL_CLIMATES);
    let emotionalClimate = pickRandom(climateOptions);

    // Adjust based on social class (lower = more stress)
    if (socialClass.economic_level < 4 && Math.random() > 0.5) {
      emotionalClimate = pickRandom([
        "tense_waiting", "chaotic_unpredictable", "anxious_constant"
      ]);
    }

    const climateData = EMOTIONAL_CLIMATES[emotionalClimate];
    const atmospheric_conditions = {
      emotional_climate: emotionalClimate,
      unspoken_rules: [
        pickRandom(["dont_upset_mother", "never_cry", "always_be_happy", "be_invisible", "be_perfect"]),
        pickRandom(["what_happens_here_stays_here", "family_comes_first_always", "be_the_best_or_dont_try"])
      ],
      survival_requirement: pickRandom([
        "be_perfect", "be_invisible", "be_useful", "be_the_mediator",
        "read_moods_constantly", "dont_have_needs"
      ]),
      base_threat_level: climateData?.base_threat || 0.3
    };

    // Layer 6: Biology
    const biology = {
      temperament: pickRandom(["easy", "difficult", "slow_to_warm", "highly_sensitive"]),
      sensitivity: Math.random(),
      resilience: Math.random(),
      energy_level: pickRandom(["high", "moderate", "low", "variable"]),
      appearance_trajectory: pickRandom([
        "plain_stays_plain", "attractive_stays_attractive",
        "striking_unusual", "unremarkable_forgettable"
      ])
    };

    // Layer 7: Embodiment
    const embodiment = {
      body_relationship: pickRandom(BODY_RELATIONSHIPS),
      movement_quality: pickRandom([
        "athletic_coordinated", "graceful_fluid", "clumsy_awkward",
        "deliberate_controlled", "minimal_contained"
      ]),
      somatic_patterns: []
    };

    // Layer 8: Attachment
    // Influenced by family wounds and atmospheric conditions
    let attachmentStyle: keyof typeof ATTACHMENT_STYLES = 'secure';
    if (atmospheric_conditions.base_threat_level > 0.6) {
      attachmentStyle = pickRandom(['anxious', 'avoidant', 'disorganized']);
    } else if (atmospheric_conditions.base_threat_level > 0.3) {
      attachmentStyle = pickRandom(['secure', 'anxious', 'avoidant']);
    }

    const styleData = ATTACHMENT_STYLES[attachmentStyle];
    const copingKey = pickRandom(Object.keys(COPING_STYLES)) as keyof typeof COPING_STYLES;

    const attachment = {
      style: attachmentStyle,
      subtype: pickRandom(styleData.subtypes),
      core_beliefs: {
        self: [pickRandom(CORE_BELIEFS_SELF), pickRandom(CORE_BELIEFS_SELF)],
        others: [pickRandom(CORE_BELIEFS_OTHERS)],
        world: [pickRandom(CORE_BELIEFS_WORLD)]
      },
      defense_mechanisms: [
        pickRandom(DEFENSE_MECHANISMS.primitive),
        pickRandom(DEFENSE_MECHANISMS.neurotic)
      ],
      coping_style: copingKey
    };

    return {
      world_context,
      cultural_identity,
      generational_echoes,
      family,
      atmospheric_conditions,
      biology,
      embodiment,
      attachment
    };
  }

  /**
   * Generate a parent profile
   */
  private generateParent(woundCategory: keyof typeof PARENT_WOUNDS | null): ParentProfile {
    const present = Math.random() > 0.15; // 85% present

    if (!present) {
      return { present: false };
    }

    if (!woundCategory || Math.random() > 0.6) {
      return { present: true };
    }

    const wounds = PARENT_WOUNDS[woundCategory];
    return {
      present: true,
      wound: pickRandom(wounds),
      wound_category: woundCategory,
      coping: pickRandom([
        "emotional_unavailability", "workaholism", "substance_use",
        "perfectionism", "rage_outbursts", "withdrawal"
      ])
    };
  }

  /**
   * Simulate life events (instant, no AI)
   */
  simulateLifeEvents(character: Partial<WorldCharacter>): LifeEvent[] {
    const events: LifeEvent[] = [];
    const eventCount = 80 + Math.floor(Math.random() * 70); // 80-150 events

    // Age phases with different domain weights
    const phases = [
      { name: 'early', startAge: 0, endAge: 5, weights: { family: 0.75, peer: 0.05, world: 0.05, body: 0.15 } },
      { name: 'childhood', startAge: 6, endAge: 11, weights: { family: 0.50, peer: 0.25, world: 0.15, body: 0.10 } },
      { name: 'adolescence', startAge: 12, endAge: 18, weights: { family: 0.30, peer: 0.35, world: 0.20, body: 0.15 } }
    ];

    for (let i = 0; i < eventCount; i++) {
      const age = Math.random() * 18;
      const phase = phases.find(p => age >= p.startAge && age <= p.endAge) || phases[0];

      // Pick domain based on phase weights
      const domain = weightedRandom(phase.weights);

      // Determine valence (positive/negative/traumatic)
      const valenceRoll = Math.random();
      const baseThreat = character.psychology?.atmospheric_conditions.base_threat_level || 0.3;

      let valence: 'positive' | 'negative' | 'traumatic';
      if (valenceRoll < 0.3 + (1 - baseThreat) * 0.3) {
        valence = 'positive';
      } else if (valenceRoll < 0.85) {
        valence = 'negative';
      } else {
        valence = 'traumatic';
      }

      // Get event type
      const domainEvents = EVENT_TEMPLATES[domain as keyof typeof EVENT_TEMPLATES];
      if (!domainEvents) continue;

      const eventList = valence === 'traumatic'
        ? domainEvents.traumatic || domainEvents.negative
        : domainEvents[valence] || domainEvents.negative;

      if (!eventList || eventList.length === 0) continue;

      const eventType = pickRandom(eventList);
      const severity = valence === 'traumatic'
        ? 0.7 + Math.random() * 0.3
        : valence === 'negative'
          ? 0.3 + Math.random() * 0.4
          : 0.1 + Math.random() * 0.3;

      events.push({
        id: `evt_${i}`,
        age: Math.round(age * 10) / 10,
        domain,
        type: eventType,
        valence,
        severity,
        belief_impacts: {}
      });
    }

    // Sort by age
    events.sort((a, b) => a.age - b.age);

    return events;
  }

  /**
   * Extract core memories from events
   */
  extractCoreMemories(events: LifeEvent[]): CoreMemory[] {
    // Core memories are high-severity events
    const significant = events.filter(e =>
      e.severity > 0.6 || e.valence === 'traumatic'
    );

    // Take top 10-15 most significant
    const sorted = significant
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 10 + Math.floor(Math.random() * 5));

    return sorted.map(event => ({
      event_id: event.id,
      age: event.age,
      type: event.type,
      severity: event.severity,
      is_elaborated: false
    }));
  }

  /**
   * Elaborate a character using AI
   */
  async elaborateCharacter(character: Partial<WorldCharacter>): Promise<WorldCharacter['elaborations']> {
    const prompt = `You are elaborating a character seed into specific narrative details.

CHARACTER SEED:
${JSON.stringify(character.psychology, null, 2)}

WORLD CONTEXT:
- World: ${this.world.name} (${this.world.era})
- Neighborhood: ${character.neighborhood}
- Social Class: ${character.social_class}
- Profession: ${character.profession}

CORE MEMORIES TO ELABORATE (provide 2-3 sentences each):
${character.core_memories?.slice(0, 8).map(m =>
  `- Age ${m.age}: ${m.type} (severity: ${m.severity.toFixed(2)})`
).join('\n')}

For each core memory, provide:
1. WHAT HAPPENED: Specific, sensory, concrete (who, where, when)
2. ATTRIBUTION: What the child concluded about themselves
3. SOMATIC: Where this lives in the body (optional)

For MOTHER and FATHER (if present):
1. NAME: Full name appropriate to the world/culture
2. WHAT DAMAGED THEM: Specific backstory for their wound
3. HOW THEY COPE: Concrete behavioral patterns
4. PROVIDES: What they successfully give the child
5. FAILS TO PROVIDE: What's missing

Also generate:
- VISUAL DESCRIPTION: 2-3 sentences describing appearance
- VOICE SAMPLES: 3-4 short dialogue examples showing how they speak
- STORY HOOKS: 3 potential story conflicts for this character

Keep it brief but specific. This is a character, not an essay.
Respond in JSON format.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Extract JSON from response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.error('Elaboration error:', error);
    }

    return undefined;
  }

  /**
   * Generate a character's name using AI
   */
  async generateName(character: Partial<WorldCharacter>): Promise<string> {
    const prompt = `Generate a single name for a character with these traits:
- World: ${this.world.name} (${this.world.era})
- Culture: ${character.psychology?.cultural_identity.group}
- Social class: ${character.social_class}
- Gender: ${character.gender}
- Age: ${character.age}

Just respond with the full name, nothing else.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 50,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text.trim();
      }
    } catch (error) {
      console.error('Name generation error:', error);
    }

    // Fallback
    return `Character_${character.id?.slice(-6)}`;
  }

  /**
   * Generate relationships between characters
   */
  generateRelationships(
    character: WorldCharacter,
    otherCharacters: WorldCharacter[]
  ): CharacterRelationship[] {
    const relationships: CharacterRelationship[] = [];

    for (const other of otherCharacters) {
      if (other.id === character.id) continue;

      // Same neighborhood = higher chance of relationship
      const sameNeighborhood = other.neighborhood === character.neighborhood;
      const sameFaction = other.faction === character.faction;
      const ageGap = Math.abs(other.age - character.age);

      let connectionChance = 0.1;
      if (sameNeighborhood) connectionChance += 0.3;
      if (sameFaction) connectionChance += 0.2;
      if (ageGap < 10) connectionChance += 0.1;

      if (Math.random() < connectionChance) {
        const types: CharacterRelationship['type'][] = [
          'colleague', 'friend', 'acquaintance', 'rival'
        ];
        if (sameFaction) types.push('ally');
        if (ageGap < 5) types.push('friend');

        relationships.push({
          target_character_id: other.id,
          type: pickRandom(types),
          valence: pickRandom(['positive', 'negative', 'ambivalent']),
          intensity: 0.3 + Math.random() * 0.5
        });
      }
    }

    return relationships;
  }

  /**
   * Full generation pipeline for one character
   */
  async generateFullCharacter(
    existingCharacters: WorldCharacter[] = []
  ): Promise<WorldCharacter> {
    // Phase 1: Generate seed
    const seed = this.generateSeed();

    // Phase 2: Simulate life events
    const life_events = this.simulateLifeEvents(seed);
    seed.life_events = life_events;
    seed.generation_phase = 'simulated';

    // Phase 3: Extract core memories
    seed.core_memories = this.extractCoreMemories(life_events);

    // Phase 4: Generate name
    seed.name = await this.generateName(seed);

    // Phase 5: AI Elaboration
    seed.elaborations = await this.elaborateCharacter(seed);
    seed.generation_phase = 'elaborated';

    // Phase 6: Generate relationships
    seed.relationships = this.generateRelationships(
      seed as WorldCharacter,
      existingCharacters
    );

    seed.generation_phase = 'complete';

    return seed as WorldCharacter;
  }
}
