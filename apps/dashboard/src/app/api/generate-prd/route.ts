import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase environment variables not configured')
  }

  return createClient(url, key)
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase()
    const { ideaId } = await request.json()

    const { data: idea, error: fetchError } = await supabase
      .from('dj_ideas')
      .select('*')
      .eq('id', ideaId)
      .single()

    if (fetchError || !idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    const prd = await generatePRD(idea)

    const { error: updateError } = await supabase
      .from('dj_ideas')
      .update({
        prd,
        status: 'pending_approval',
      })
      .eq('id', ideaId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true, prd })
  } catch (error) {
    console.error('PRD generation failed:', error)
    return NextResponse.json({ error: 'Failed to generate PRD' }, { status: 500 })
  }
}

async function generatePRD(idea: {
  title: string
  raw_input: string
  input_type: string
  project_dna: string
}): Promise<string> {
  // World-builder uses a special detailed template (no API call needed - template has all the details)
  if (idea.project_dna === 'world-builder') {
    return generateWorldBuilderPRD(idea)
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (!anthropicKey) {
    return generateTemplatePRD(idea)
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Generate a concise PRD (Product Requirements Document) for this idea.

IDEA:
${idea.raw_input}

TYPE: ${idea.input_type}
PROJECT TYPE: ${idea.project_dna}

Generate a PRD with these sections:
## Summary
One sentence description.

## Problem
What problem does this solve?

## Solution
How will this work?

## Tech Stack
Based on project type: ${idea.project_dna}

## Features
Bulleted list of features (keep it minimal, 3-5 items)

## Acceptance Criteria
Checkboxes for what "done" looks like

## Estimate
Rough hours to build

Keep it SHORT and ACTIONABLE. No fluff. This will be used by an AI to build the project.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error('Anthropic API error')
    }

    const data = await response.json()
    return data.content[0].text
  } catch (error) {
    console.error('Claude API failed, using template:', error)
    return generateTemplatePRD(idea)
  }
}

// ============================================
// WORLD BUILDER PRD - DETAILED CHARACTER GENERATION
// ============================================

function generateWorldBuilderPRD(idea: {
  title: string
  raw_input: string
}): string {
  return `# World Builder PRD: ${idea.title}

## User Request
${idea.raw_input}

---

## YOUR TASK

Generate deeply-layered characters for this world. Each character must have full psychological depth using the 8-LAYER PSYCHOLOGY SYSTEM below.

**IMPORTANT**: Psychology is EMERGENT - you don't assign "they're anxious" - you simulate 80-150 life events and their psychology EMERGES from those experiences. The events SHAPE who they become.

**NARRATIVE ROLES are ASSIGNED**: If the user specifies they need a "Protagonist" or "Turncoat", assign that narrative function. But the CHARACTER'S PSYCHOLOGY still emerges from their events.

Save all characters to Supabase table \`dj_world_characters\`.

---

## OUTPUT REQUIREMENTS

For each character, generate ALL of the following (this matches the full Loomiverse character system):

1. **Basic Info**: name, age, gender, neighborhood, faction, social_class, profession
2. **Full 8-Layer Psychology** (see below)
3. **Life Events**: **80-150 simulated childhood events** from ages 0-18
4. **Core Memories**: 5-15 formative moments with detailed AI elaborations
5. **Extended Systems** (Phase 4):
   - Belief schemas with triggers and evidence
   - Dialectical tensions (conflicting beliefs)
   - Contextual selves (how they act with different people)
   - Desire structure (surface wants, underlying needs, forbidden desires)
6. **Elaborations**: visual description, voice samples (3-4 lines of dialogue), story hooks
7. **Narrative Role** (if specified by user): Assign from the 20-Role Archetype System
8. **Big Five Traits**: Emerge from life events simulation
9. **Shadow Traits**: Callousness, dominance, paranoia, etc. (0-1 scale)
10. **Coping Patterns**: Fight/flight/freeze/fawn tendencies
11. **Protective Factors**: What helped them survive/thrive
12. **Repetition Compulsions**: Patterns they unconsciously repeat

---

## THE 20-ROLE ARCHETYPE SYSTEM (NARRATIVE FUNCTION)

If the user requests specific roles, assign from this system. These define WHAT THE CHARACTER DOES IN THE STORY (not their internal psychology).

### GROUP A: Primary Drivers
| # | Archetype | Definition |
|---|-----------|------------|
| 1 | **Catalyst** | Disrupts status quo; sets events in motion |
| 2 | **Protagonist** | Central perspective; choices define the narrative |
| 3 | **Antagonist** | Primary opposition; incompatible goals (not necessarily evil) |
| 4 | **Rival** | Competes for same goal; not morally opposed |

### GROUP B: Wisdom & Guidance
| 5 | **Mentor** | Provides knowledge/training; carries relevant scars |
| 6 | **Sage** | Neutral wisdom; must be sought out |
| 7 | **Heretic** | Challenges accepted beliefs |

### GROUP C: Loyalty & Betrayal
| 8 | **Lieutenant** | Trusted ally; loyalty holds |
| 9 | **Devotee** | True believer; absolute conviction |
| 10 | **Turncoat** | Will betray; positioned close to trust |

### GROUP D: Chaos & Unpredictability
| 11 | **Wildcard** | Unpredictable; own inscrutable logic |
| 12 | **Trickster** | Uses wit and deception; exposes truth |
| 13 | **Disruptor** | Tears down systems; believes destruction necessary |

### GROUP E: Emotional Anchors
| 14 | **Innocent** | Worth protecting; vulnerability raises stakes |
| 15 | **Heart** | Emotional center; maintains group bonds |
| 16 | **Beloved** | Deep personal attachment to Protagonist |

### GROUP F: Power & Authority
| 17 | **Sovereign** | Institutional power; decisions affect many |
| 18 | **Enforcer** | Executes power's will; loyal to structure |
| 19 | **Broker** | Trades favors/info; neutral but self-interested |

### GROUP G: Outsiders
| 20 | **Exile** | Cast out insider; sees what others miss |

### HIGH-TENSION PAIRINGS (create these relationships for drama)
- Protagonist ↔ Antagonist: Core conflict
- Lieutenant ↔ Turncoat: Trust vs. betrayal
- Devotee ↔ Heretic: Faith vs. doubt
- Sovereign ↔ Disruptor: Order vs. chaos
- Mentor ↔ Antagonist: Often share history

---

## THE 8-LAYER PSYCHOLOGY SYSTEM

Every character's psychology emerges from 8 layers, built from birth:

### LAYER 1: WORLD CONTEXT
- Era and time period
- Region/location
- Historical events they lived through
- Technology level and its impact on daily life

**ERA OPTIONS** (pick one or use world's era):
Ancient Egypt, Ancient Greece, Roman Empire, Dark Ages, High Medieval, Late Medieval, Renaissance, Age of Exploration, Colonial Era, Revolutionary Era, Early Industrial, Victorian, American Civil War, Old West, Gilded Age, Edwardian, World War I, Roaring Twenties, Great Depression, World War II, Post-War, Cold War, Counterculture, Digital Dawn, Information Age, Near Future, Mid Future, Far Future, Post-Apocalyptic, Fantasy Medieval

**REGION OPTIONS** (pick one or use world's region):
American Northeast, American South, American Midwest, American West, American Southwest, Pacific Northwest, Latin America, Caribbean, British Isles, Western Europe, Eastern Europe, Nordic, Mediterranean, Slavic, East Asia, South Asia, Southeast Asia, Central Asia, Middle East, North Africa, West Africa, East Africa, Southern Africa, Australia, Pacific Islands, Major Metropolis, Industrial City, Port City, Capital City, Border Town, Farming Community, Mining Town, Fishing Village, Mountain Community, Desert Settlement, Space Station, Colony World, Post-Apocalyptic Wasteland, Fantasy Kingdom, Free City

### LAYER 2: CULTURAL IDENTITY
- Cultural/ethnic group
- Sense of belonging: "insider", "conditional_insider", "outsider", or "targeted"
- Identity relationship (pick one):
  - proud_activist (actively celebrates heritage)
  - proud_private (proud but doesn't make it central)
  - comfortable_integrated (at peace, blends worlds)
  - conflicted_assimilating (trying to fit in, feels guilty)
  - conflicted_rejecting (rejecting heritage, feels empty)
  - ashamed_hiding (actively conceals identity)
  - exploring_curious (just beginning to understand)
  - disconnected_ignorant (doesn't know their heritage)
  - reclaiming_returning (reconnecting after disconnection)
  - transcended_beyond (has moved past cultural boxes)

**CULTURAL VALUE DIMENSIONS** (0-1 scale for each):
- collectivism_individualism (0=group identity, 1=personal identity)
- family_obligation (0=low, 1=absolute duty)
- respect_for_elders (0=age-neutral, 1=age=authority)
- gender_role_rigidity (0=fluid, 1=strict)
- religious_centrality (0=secular, 1=all-encompassing)
- honor_culture (0=none, 1=honor-violence expected)
- education_priority (0=low, 1=primary path)
- emotional_expression (0=suppressed, 1=freely expressed)

### LAYER 3: GENERATIONAL ECHOES
- **Family myth**: The story the family tells about itself (pick 1-3):
  - Survival: "We are survivors", "We came from nothing", "We never give up", "What doesn't kill us makes us stronger"
  - Values: "Education is the only way out", "Hard work solves everything", "Money is the root of evil", "The Lord provides"
  - Trust: "Don't trust outsiders", "Family is everything", "Blood is thicker than water", "We take care of our own"
  - Silence: "We don't talk about feelings", "What happens here stays here", "Some things are better left unsaid"
  - Gender: "Men provide, women sacrifice", "Boys don't cry", "Women hold the family together"
  - Destiny: "We're cursed", "Good things don't last for us", "We're blessed", "Something always saves us"

- **Unmourned loss** (pick 1-2):
  - People: child_who_died_young, miscarriages_never_discussed, parent_who_left, sibling_institutionalized
  - Places: homeland_left_behind, house_lost_to_disaster, family_farm_sold
  - Dreams: dreams_sacrificed_for_survival, career_that_could_have_been, talent_never_developed
  - Status: wealth_lost, reputation_destroyed, business_that_failed

- **Invisible loyalty** (pick 1-2):
  - Achievement: must_succeed_to_justify_sacrifice, must_achieve_what_parent_couldnt, must_prove_familys_worth
  - Limitation: must_not_surpass_parent, must_not_be_happier_than_sibling, must_not_leave_family
  - Role: must_be_the_caretaker, must_be_the_peacekeeper, must_carry_the_family_grief
  - Pattern: must_repeat_family_pattern, must_break_family_pattern, must_prove_family_wrong

- **Family secret** (optional, pick 0-1):
  - Identity: parent_had_another_family, adoption_hidden, true_parentage_different
  - Crime: family_wealth_from_crime, relative_incarcerated_hidden
  - Trauma: suicide_hidden_as_accident, abuse_covered_up

- **Grandparent experience**: Major event grandparents lived through that echoes down

### LAYER 4: FAMILY STRUCTURE
- Structure: nuclear, single_parent, extended, blended, absent_parent
- Birth order: only, eldest, middle, youngest
- Socioeconomic status

**PARENT WOUND CATEGORIES** (pick one per parent):

ABANDONMENT wounds:
- abandoned_by_parent_childhood, parent_chose_new_family, parent_died_suddenly, parent_incarcerated, parent_emotionally_absent_while_present

NEGLECT wounds:
- emotional_neglect_self_reliant, physical_neglect_survival_mode, attention_neglect_invisible, affection_neglect_touch_starved, validation_neglect_unseen

ABUSE wounds:
- physical_abuse_violent, emotional_abuse_criticism, emotional_abuse_manipulation, verbal_abuse_degradation

INADEQUACY wounds:
- never_good_enough_perfectionist, never_good_enough_golden_sibling, wrong_gender_disappointment

PARENTIFICATION wounds:
- parentified_raised_siblings, parentified_emotional_spouse, parentified_caretaker_ill_parent, parentified_mediator_conflict

LOSS wounds:
- lost_sibling_young, lost_parent_young, multiple_losses_serial, traumatic_loss_witnessed

DYSFUNCTION wounds:
- addiction_in_family, mental_illness_in_family, domestic_violence_witnessed, extreme_poverty

**WOUND COPING PATTERNS** (how they cope with their wound):

For ABANDONMENT:
- Anxious: clings_desperately, tests_loyalty_constantly, needs_constant_reassurance
- Avoidant: walls_off_preemptively, leaves_before_being_left, refuses_to_attach

For NEGLECT:
- Compensatory: self_reliant_extreme, overachieves_for_attention, people_pleases_desperately
- Acceptance: believes_deserves_nothing, minimizes_own_needs

For ABUSE:
- Externalized: becomes_abuser, controlling_relationships
- Internalized: believes_deserved_it, attracts_abusers
- Protective: hypervigilant_always, protects_others_fiercely

For INADEQUACY:
- Striving: perfectionist_compulsive, never_satisfied_with_self
- Giving up: self_sabotages_success, imposter_syndrome

- Number of siblings

### LAYER 5: ATMOSPHERIC CONDITIONS
- **Emotional climate** of the home (pick one):
  - Warm: warm_secure, warm_chaotic, warm_smothering
  - Neutral: functional_distant, performative, transactional
  - Cold: cold_efficient, cold_critical, cold_withholding
  - Tense: tense_waiting, tense_walking_eggshells
  - Chaotic: chaotic_unpredictable, chaotic_violent
  - Dark: anxious_constant, depressed, terrifying, numb
  - Complex: split (one parent warm, one cold), public_private_split, cyclical

- **Unspoken rules** (pick 2-4):
  - Emotion rules: dont_upset_mother, dont_make_father_angry, never_cry, always_be_happy, emotions_are_weakness, dont_show_fear
  - Behavior rules: be_invisible, be_perfect, be_the_star, be_the_helper, be_the_mediator, dont_ask_questions
  - Secrecy rules: what_happens_here_stays_here, never_discuss_family_business, pretend_everything_is_fine
  - Loyalty rules: family_comes_first_always, blood_is_thicker_than_water, outsiders_cant_be_trusted
  - Achievement rules: be_the_best_or_dont_try, education_is_everything, success_justifies_everything
  - Gender rules: boys_dont_cry, girls_should_be_quiet, men_provide, women_sacrifice

- **Survival requirement** (pick 1-2):
  - Be something: be_perfect, be_invisible, be_entertaining, be_useful, be_the_parent, be_the_mediator, be_the_scapegoat
  - Don't be: dont_have_needs, dont_feel_anything, dont_exist_too_loudly, dont_be_weak
  - Do something: read_moods_constantly, anticipate_needs, manage_parent_emotions, defuse_conflict, perform_wellness
  - Active survival: stay_alert_always, be_ready_to_run, trust_no_one, dissociate_when_needed

### LAYER 6: BIOLOGY
- **Temperament**: easy, difficult, slow_to_warm, highly_sensitive

**TEMPERAMENT DIMENSIONS** (0-1 scale for each):
- sensitivity (0=thick-skinned, 1=easily overwhelmed)
- baseline_energy (0=lethargic, 1=hyperactive)
- novelty_seeking (0=routine-preferring, 1=thrill-seeking)
- adaptability (0=rigid, 1=flexible)
- persistence (0=gives up easily, 1=stubborn)
- initial_mood (0=melancholic baseline, 1=optimistic baseline)
- intensity (0=muted reactions, 1=dramatic reactions)
- approach_withdrawal (0=cautious, 1=approaches eagerly)

**SHADOW TRAITS** (0-1 scale, can increase based on events):
- callousness (0=highly empathic, 1=unconcerned with suffering)
- dominance_drive (0=submissive, 1=needs to control)
- paranoia_tendency (0=trusting, 1=sees threats everywhere)
- manipulation_tendency (0=straightforward, 1=uses others as tools)
- vengefulness (0=forgives easily, 1=holds grudges)
- entitlement (0=feels deserves nothing, 1=feels deserves everything)
- grandiosity (0=self-deprecating, 1=inflated self-image)

**BIRTH CIRCUMSTANCES** (pick one):
- Medical: normal_uncomplicated, difficult_birth, premature_nicu_stay, mother_nearly_died, twin_who_survived
- Context: unwanted_pregnancy, miracle_after_infertility, replacement_after_loss, wrong_gender_disappointment, born_during_crisis

- **Appearance trajectory**: plain_stays_plain, plain_becomes_attractive, attractive_stays_attractive, attractive_becomes_plain, striking_unusual, unremarkable_forgettable, intimidating_presence, disarming_harmless, scarred_marked

### LAYER 7: EMBODIMENT
- **Body relationship** (pick one):
  - comfortable_integrated (body and self are one)
  - instrumental_tool (body serves purposes)
  - adversarial_enemy (at war with body)
  - dissociated_disconnected (body feels separate)
  - hyperaware_monitoring (constantly tracking body)
  - shameful_source (body as source of shame)
  - proud_source_of_power (body as pride)
  - vulnerable_fragile (body always at risk)
  - weapon_dangerous (body as weapon)
  - object_for_others (body exists for others' use)
  - neglected_ignored (body ignored until problems)
  - temple_sacred (body as spiritual vessel)

- **Body violations** (if any, pick 0-2):
  - Violence: hit_beaten_childhood, tortured, restrained_imprisoned
  - Sexual: touched_inappropriately, sexually_assaulted
  - Medical: medical_trauma_procedures, denied_medical_care
  - Neglect: starved, sleep_deprived
  - Exploitation: forced_labor

- **Movement quality**: athletic_coordinated, graceful_fluid, clumsy_awkward, restricted_careful, hyperactive_restless, deliberate_controlled, predator_economy, prey_vigilance, theatrical_expressive, minimal_contained, aggressive_expansive, submissive_contracted

- **Somatic patterns** (where stress lives in body):
  - Locations: stomach, chest, throat, shoulders, neck, jaw, headaches, back_lower, heart_racing
  - Triggers: loud_noises_startle, yelling_freeze, touch_flinch, crowds_overwhelm, being_watched_paranoia, cornered_rage

### LAYER 8: ATTACHMENT
- **Attachment style** (pick one):
  - secure (comfortable with intimacy and independence)
    - Subtypes: stable_secure, earned_secure
  - anxious (fears abandonment, needs reassurance)
    - Subtypes: anxious_preoccupied, anxious_dependent, anxious_clingy, anxious_jealous
  - avoidant (uncomfortable with closeness)
    - Subtypes: avoidant_dismissive, avoidant_fearful, avoidant_counter_dependent
  - disorganized (caregiver was both comfort and fear)
    - Subtypes: disorganized_chaotic, disorganized_frozen, disorganized_controlling, disorganized_dissociative

- **Core beliefs about SELF** (pick 2-3):
  - Worthiness: "I am fundamentally flawed", "I am unlovable as I am", "I am worthy of love", "I am only lovable when I perform", "I am a burden", "I am too much", "I am not enough"
  - Identity: "I don't know who I am", "I am what others need me to be", "I am my achievements", "I am my failures"
  - Danger: "I am dangerous to those I love", "I destroy everything I touch", "My anger is deadly", "My needs are dangerous"
  - Invisibility: "I am invisible", "I don't matter", "I shouldn't exist", "My voice doesn't count"
  - Capability: "I can handle anything", "I am helpless", "I can only rely on myself", "I am incompetent"
  - Specialness: "I am destined for greatness", "I am cursed", "I am beyond redemption"
  - Deserving: "I deserve happiness", "I don't deserve happiness", "Good things aren't meant for me"

- **Core beliefs about OTHERS** (pick 1-2):
  - Trust: "Others can be trusted", "Others cannot be trusted", "Trust will be betrayed"
  - Intent: "Others want to hurt me", "Others want to use me", "Others are indifferent"
  - Reliability: "Others will be there", "Others will disappoint", "Others will abandon me"
  - Safety: "Others are safe", "Others are dangerous", "Men are dangerous", "Authority figures are corrupt"
  - Connection: "Deep connection is impossible", "I am fundamentally alone"

- **Core beliefs about WORLD** (pick 1-2):
  - Safety: "The world is safe", "The world is dangerous", "Nowhere is truly safe"
  - Fairness: "The world is fair", "Life is random", "The game is rigged"
  - Control: "I can control my destiny", "I have no control", "Hard work pays off"
  - Meaning: "Life has meaning", "Life is meaningless", "Everything happens for a reason"
  - Change: "Things can get better", "Things never change", "The system is broken"

- **Defense mechanisms** (pick 2-3):
  - Primitive: denial, projection, splitting, dissociation, acting_out, passive_aggression, regression, somatization
  - Neurotic: repression, displacement, intellectualization, rationalization, reaction_formation, compartmentalization
  - Mature: sublimation, humor, altruism, suppression, anticipation, acceptance

- **Coping style** (primary response to threat):
  - FIGHT: physical_aggression, verbal_aggression, confrontation, control_seeking, perfectionism, blaming, self_criticism
  - FLIGHT: physical_escape, avoidance, distraction, substance_use, workaholism, ghosting, isolation, dissociation
  - FREEZE: paralysis, procrastination, shutdown, silence, emotional_flatness, numbness, depersonalization
  - FAWN: people_pleasing, over_apologizing, anticipating_needs, agreeing_always, self_erasure, boundary_collapse

- **Shadow triggers** (what activates their worst):
  - Power: when_feeling_powerless, when_being_controlled, when_status_challenged
  - Threat: when_loved_ones_threatened, when_survival_threatened, when_reputation_threatened
  - Trust: when_trust_broken, when_betrayed, when_lied_to, when_abandoned
  - Rejection: when_rejected, when_excluded, when_criticized, when_humiliated
  - Trauma: when_reminded_of_abuse, when_cornered, when_exhausted

---

## PROTECTIVE FACTORS (what helped them survive)

Pick 2-4 per character:

**Relational**: one_unconditional_relationship, mentor_figure, supportive_friend, loving_grandparent, protective_sibling, teacher_who_believed, pet_animal_companion

**Competence**: discovered_talent, academic_success, athletic_ability, artistic_expression, practical_skills, intelligence_recognized

**Meaning**: religious_faith, spiritual_practice, purpose_mission, cultural_identity, helping_others

**Environment**: safe_place, nature_access, books_library, extracurricular_activities, school_haven

**Internal**: high_intelligence, easy_temperament, sense_of_humor, creativity, future_orientation

---

## REPETITION COMPULSIONS (patterns they unconsciously repeat)

Pick 0-2 per character:

**Relationship patterns**: chooses_unavailable_partners, chooses_abusive_partners, rescues_broken_people, abandons_before_abandoned, pushes_away_when_close, sabotages_good_relationships

**Achievement patterns**: sabotages_success_when_close, chooses_doomed_ventures, recreates_failure, success_followed_by_destruction

**Family patterns**: recreates_family_dynamic, becomes_like_abusive_parent, marries_copy_of_parent, parents_like_was_parented

**Trauma patterns**: puts_self_in_danger, attracts_predators, seeks_out_familiar_pain, creates_crises

---

## BIG FIVE PERSONALITY TRAITS

These EMERGE from the life events simulation. Track how events push these scores:

- **Openness** (0-1): curiosity, creativity, openness to new experiences
- **Conscientiousness** (0-1): organization, dependability, self-discipline
- **Extraversion** (0-1): sociability, assertiveness, positive emotions
- **Agreeableness** (0-1): cooperation, trust, altruism
- **Neuroticism** (0-1): anxiety, moodiness, emotional instability

Events affect Big Five:
- Positive events with peers → increase Extraversion, Agreeableness
- Traumatic family events → increase Neuroticism
- Achievement events → increase Conscientiousness
- Supportive mentors → increase Openness

---

## LIFE EVENT SIMULATION

Generate **80-150 life events** per character from ages 0-18 (this is critical for psychological depth). Each event needs:
- Age when it happened
- Domain: family, peer, world, or body
- Type: specific event (e.g., "parent_criticism", "friendship_formed", "bullied")
- Valence: positive, negative, or traumatic
- Severity: 0-1

Event types by domain:

**FAMILY events:**
- Positive: parent_praise, parent_teaches, defended_by_parent, family_celebration, sibling_support
- Negative: parent_criticism, parent_absent, parental_conflict, favoritism_shown, broken_promise
- Traumatic: physical_abuse, emotional_abuse, neglect_severe, parent_death, abandonment

**PEER events:**
- Positive: friendship_formed, defended_by_peer, group_acceptance, first_crush, team_success
- Negative: betrayal, exclusion, bullied, romantic_rejection, humiliated_publicly
- Traumatic: severe_bullying, assault_by_peer, witnessed_peer_death

**WORLD events:**
- Positive: positive_teacher, mentor_found, talent_recognized, achievement_external
- Negative: negative_teacher, discrimination_experienced, unfair_punishment, public_failure
- Traumatic: violence_witnessed, violence_victim, natural_disaster, war_exposure

**BODY events:**
- Positive: discovered_strength, athletic_achievement, appearance_admired
- Negative: illness, injury, appearance_mocked, body_shame_event
- Traumatic: serious_illness, serious_injury, hospitalization

---

## CORE MEMORY ELABORATION

For the 5-15 most significant events, write:
1. **WHAT HAPPENED**: Specific, sensory, concrete (who, where, when) - 2-3 sentences
2. **ATTRIBUTION**: What the child concluded about themselves
3. **SOMATIC**: Where this lives in the body (optional)

Example:
> Age 5: sibling_death (severity: 0.85)
> WHAT HAPPENED: Younger brother (age 3) dies of fever. Mother collapses into grief. Father calls it "God's will." Character watches from the doorway, unable to move. Nobody looks at them.
> ATTRIBUTION: "Maybe I should have died instead."
> SOMATIC: Chest tightness when others grieve

---

## PARENT ELABORATION

For each present parent, generate:
1. **Full name** (appropriate to culture/era)
2. **What damaged them**: Specific backstory for their wound
3. **How they cope**: Concrete behavioral patterns
4. **What they provide**: What they successfully give the child
5. **What they fail to provide**: What's missing

---

## EXTENDED SYSTEMS (PHASE 4 - CRITICAL FOR DEPTH)

For each character, generate these psychological depth systems:

### 1. BELIEF SCHEMAS
For 2-3 core negative beliefs, create:
- **Triggers**: What activates this belief
- **Evidence library**: The "proof" they collect that confirms the belief
- **Protective behaviors**: What they do to avoid triggering the belief

Example:
> Belief: "I am unlovable as I am"
> Triggers: Criticism, rejection, being ignored, comparing self to others
> Evidence: "Mom never hugged me", "My ex left", "People always leave eventually"
> Protective behaviors: Overperforming, people-pleasing, avoiding vulnerability

### 2. DIALECTICAL TENSIONS
2-3 internal conflicts between opposing beliefs:
- Belief A vs Belief B
- Which wins in different contexts
- The cost of each winning

Example:
> "I must be perfect" vs "I am fundamentally flawed"
> Perfect wins at work (exhausting overachievement)
> Flawed wins in intimacy (sabotages relationships)

### 3. CONTEXTUAL SELVES
How they behave differently with:
- **Safe people**: Who they become when truly relaxed
- **Threatening people**: Who they become when activated
- **Under stress**: Default survival mode
- **Best self**: Who they could be if healed

### 4. DESIRE STRUCTURE
- **Surface wants**: What they say they want
- **Underlying needs**: What they actually need (often unconscious)
- **Forbidden desires**: What they won't admit to wanting
- **What they need to heal**: The specific thing that would help them grow

Example:
> Surface: "I want to be successful and respected"
> Underlying: "I want to feel worthy without having to earn it"
> Forbidden: "I want someone to take care of me"
> To heal: "To be loved after making a mistake"

---

## CHARACTER ELABORATION

For each character also generate:
1. **Visual description**: 2-3 sentences describing appearance, style, presence
2. **Voice samples**: 3-4 lines of dialogue showing how they speak in different contexts
3. **Story hooks**: 2-3 potential conflicts or story opportunities for this character

---

## RELATIONSHIPS

After generating all characters, create relationships between them:
- Who knows who (same neighborhood, faction, family connections)
- Relationship type: family, friend, rival, colleague, lover, enemy
- Valence: positive, negative, ambivalent
- Brief history if relevant

---

## SUPABASE OUTPUT

Save each character to \`dj_world_characters\` table with this structure:

\`\`\`json
{
  "id": "chr_[timestamp]_[random]",
  "world_id": "[from world template if exists]",
  "name": "Character Name",
  "age": 32,
  "gender": "female",
  "neighborhood": "District Name",
  "faction": "Faction Name",
  "social_class": "Class Name",
  "profession": "Job Title",
  "narrative_role": "Lieutenant",  // From 20-Role System if specified
  "psychology": {
    "world_context": {
      "era": "Information Age",
      "region": "American Northeast",
      "setting": "urban_middle"
    },
    "cultural_identity": {
      "ethnicity": "Mixed Race",
      "subgroup": "Black/White",
      "belonging": "conditional_insider",
      "identity_relationship": "conflicted_assimilating",
      "cultural_values": {
        "collectivism_individualism": 0.6,
        "family_obligation": 0.7,
        "emotional_expression": 0.3
      }
    },
    "generational_echoes": {
      "family_myth": ["We are survivors", "Education is the only way out"],
      "unmourned_loss": "homeland_left_behind",
      "invisible_loyalty": "must_succeed_to_justify_sacrifice",
      "family_secret": null,
      "grandparent_experience": "Great Migration"
    },
    "family": {
      "structure": "single_parent",
      "birth_order": "eldest",
      "socioeconomic": "working_class",
      "mother": {
        "wound": "parentification",
        "wound_type": "parentified_raised_siblings",
        "coping": "emotional_unavailability"
      },
      "father": {
        "wound": "abandonment",
        "wound_type": "abandoned_by_parent_childhood",
        "coping": "leaves_before_being_left",
        "present": false
      },
      "siblings": 2
    },
    "atmospheric_conditions": {
      "emotional_climate": "tense_walking_eggshells",
      "unspoken_rules": ["dont_upset_mother", "be_invisible", "family_comes_first"],
      "survival_requirement": ["read_moods_constantly", "be_useful"]
    },
    "biology": {
      "temperament": "highly_sensitive",
      "temperament_dimensions": {
        "sensitivity": 0.8,
        "baseline_energy": 0.5,
        "novelty_seeking": 0.3,
        "adaptability": 0.6,
        "persistence": 0.7
      },
      "shadow_traits": {
        "callousness": 0.2,
        "paranoia_tendency": 0.5,
        "vengefulness": 0.4
      },
      "birth_circumstance": "first_child_pressure",
      "appearance_trajectory": "plain_becomes_attractive"
    },
    "embodiment": {
      "body_relationship": "hyperaware_monitoring",
      "body_violations": [],
      "movement_quality": "restricted_careful",
      "somatic_patterns": {
        "stress_location": "stomach",
        "triggers": ["yelling_freeze", "crowds_overwhelm"]
      }
    },
    "attachment": {
      "style": "anxious",
      "subtype": "anxious_preoccupied",
      "core_beliefs_self": ["I am only lovable when I perform", "I am not enough"],
      "core_beliefs_others": ["Others will disappoint", "Others judge me constantly"],
      "core_beliefs_world": ["The game is rigged", "Hard work pays off"],
      "defense_mechanisms": ["intellectualization", "people_pleasing", "repression"],
      "coping_style": "fawn",
      "shadow_triggers": ["when_criticized", "when_rejected"]
    }
  },
  "big_five": {
    "openness": 0.6,
    "conscientiousness": 0.8,
    "extraversion": 0.4,
    "agreeableness": 0.7,
    "neuroticism": 0.65
  },
  "protective_factors": ["teacher_who_believed", "academic_success", "books_library"],
  "repetition_compulsions": ["chooses_unavailable_partners"],
  "life_events": [
    {
      "age": 3.2,
      "domain": "family",
      "type": "parent_absent",
      "valence": "negative",
      "severity": 0.7,
      "belief_impact": { "I am worthy of love": -0.05 }
    }
    // ... 80-150 events total
  ],
  "core_memories": [
    {
      "event_index": 12,
      "age": 5.0,
      "type": "favoritism_shown",
      "what_happened": "Mother praised younger brother for drawing while ignoring her own artwork on the fridge. She stood in the doorway, watching.",
      "attribution": "My efforts don't matter. I have to try harder.",
      "somatic": "Chest tightness when being compared to others"
    }
    // ... 5-15 elaborated core memories
  ],
  "elaborations": {
    "mother_detailed": {
      "name": "Regina Thompson",
      "wound_story": "Raised three younger siblings after her mother's breakdown. Never had a childhood. Was always the responsible one.",
      "how_she_copes": "Works double shifts. When home, is physically present but emotionally elsewhere. Can't tolerate neediness.",
      "provides": ["Physical survival", "Work ethic example", "Literacy"],
      "fails_to_provide": ["Affection", "Emotional attunement", "Play"]
    },
    "father_detailed": {
      "name": "Marcus Williams",
      "wound_story": "His own father left when he was 7. Never learned what staying looked like.",
      "how_he_copes": "Serial relationships. Charming initially, then disappears. Sends birthday cards sometimes.",
      "provides": ["Occasional charisma", "Proof that people leave"],
      "fails_to_provide": ["Consistency", "Protection", "Model of commitment"]
    },
    "visual_description": "Tall and angular, with her mother's sharp cheekbones and her father's restless eyes. Dresses in layers that hide her body. Hair always pulled back tight. Moves like she's trying not to take up space.",
    "voice_samples": [
      "I'm fine. Really. Don't worry about me.",
      "If you need help with that, I can— no, it's no trouble at all.",
      "I just think if we planned it better, this wouldn't have happened.",
      "(Under stress) Why do I always have to be the one who fixes everything?"
    ],
    "story_hooks": [
      "Her father has resurfaced after 15 years. He needs something.",
      "She's been offered a promotion that would require her to stop taking care of everyone.",
      "Someone she helped has accused her of being controlling."
    ]
  },
  "extended_systems": {
    "belief_schemas": [
      {
        "belief": "I am only lovable when I perform",
        "triggers": ["receiving criticism", "seeing others praised", "making mistakes"],
        "evidence_library": ["Mom only smiled when I got good grades", "Dad left because I wasn't enough", "People only call when they need something"],
        "protective_behaviors": ["overworking", "anticipating needs before asked", "never saying no"]
      }
    ],
    "dialectical_tensions": [
      {
        "belief_a": "I must be perfect",
        "belief_b": "I am fundamentally flawed",
        "which_wins_when": "Perfect wins at work (exhausting overachievement). Flawed wins in intimacy (sabotages relationships).",
        "cost": "Exhaustion. Loneliness. Never feeling authentic."
      }
    ],
    "contextual_selves": {
      "with_safe_people": "Allows herself to be taken care of. Makes jokes. Lets her guard down. Cries.",
      "with_threatening_people": "Hyper-competent. Anticipates needs. Becomes invisible or indispensable.",
      "under_stress": "Fawns. Overworks. Stops eating. Dissociates when overwhelmed.",
      "best_self": "Asks for help. Sets boundaries. Trusts that love doesn't require earning."
    },
    "desire_structure": {
      "surface_wants": ["Career success", "Stable relationship", "To help others"],
      "underlying_needs": ["To be seen", "To rest", "To matter without performing"],
      "forbidden_desires": ["To be taken care of", "To be selfish", "To let people fail"],
      "what_they_need_to_heal": "To be loved after making a mistake. To disappoint someone and not be abandoned."
    }
  },
  "relationships": [
    {
      "character_id": "chr_xxx_yyy",
      "character_name": "Marcus (her younger brother)",
      "relationship_type": "family",
      "dynamic": "She raised him more than their mother did. He resents it. She can't stop.",
      "valence": "ambivalent"
    }
  ],
  "generation_phase": "complete",
  "created_at": "[ISO timestamp]"
}
\`\`\`

---

## ACCEPTANCE CRITERIA

- [ ] Generated requested number of characters
- [ ] Each character has full 8-layer psychology with ALL expanded options filled in
- [ ] Each character has **80-150 life events** (not 10-15!) - THIS IS CRITICAL
- [ ] Each character has 5-15 elaborated core memories with WHAT HAPPENED, ATTRIBUTION, SOMATIC
- [ ] Each character has parent elaborations (full backstory, wound_story, provides/fails_to_provide)
- [ ] Each character has **extended systems** (belief schemas with triggers/evidence, dialectical tensions, contextual selves, desire structure)
- [ ] Each character has **Big Five traits** that emerged from their events
- [ ] Each character has **temperament dimensions** (0-1 scale)
- [ ] Each character has **shadow traits** (0-1 scale)
- [ ] Each character has **protective factors** (what helped them survive)
- [ ] Each character has **repetition compulsions** (if any patterns apply)
- [ ] Each character has **coping style** (fight/flight/freeze/fawn with specifics)
- [ ] Each character has **shadow triggers** (what activates their worst)
- [ ] Each character has visual description (appearance, movement, presence)
- [ ] Each character has 3-4 voice samples showing different contexts
- [ ] Each character has 2-3 story hooks
- [ ] If user specified narrative roles, characters have them assigned
- [ ] High-tension relationship pairings created between characters
- [ ] All characters saved to Supabase with complete JSON structure

---

*This PRD was generated for world-builder project type.*`
}

function generateTemplatePRD(idea: {
  title: string
  raw_input: string
  input_type: string
  project_dna: string
}): string {
  const stacks: Record<string, string> = {
    'chrome-extension': 'Chrome Extension (Manifest v3), TypeScript',
    'adhd-game': 'Next.js, Tailwind CSS, Howler.js (sounds)',
    'utility-app': 'Next.js, Tailwind CSS, shadcn/ui, Supabase',
    api: 'Node.js, Express or Hono, TypeScript',
    script: 'TypeScript, Node.js',
  }

  return `## Summary
${idea.title}

## Problem
User needs: ${idea.raw_input}

## Solution
Build a ${idea.project_dna} that addresses the above need.

## Tech Stack
${stacks[idea.project_dna] || 'Next.js, TypeScript'}

## Features
- [ ] Core functionality as described
- [ ] Clean, minimal UI
- [ ] Error handling
- [ ] Mobile-friendly (if applicable)

## Acceptance Criteria
- [ ] Solves the stated problem
- [ ] Works without errors
- [ ] Deployed and accessible

## Estimate
2-4 hours

---
*PRD auto-generated. Review and modify before approving.*`
}
