/**
 * World Generation Runner
 *
 * Runs the full world generation process, designed for overnight batch processing.
 * Updates progress in Supabase so the dashboard can track it.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CharacterGenerator } from './generator';
import {
  WorldTemplate,
  WorldCharacter,
  WorldGenerationJob
} from './types';

// ============================================
// WORLD GENERATION RUNNER
// ============================================

export class WorldGenerationRunner {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Start a world generation job
   */
  async startJob(worldId: string): Promise<string> {
    // Fetch the world template
    const { data: world, error: worldError } = await this.supabase
      .from('dj_worlds')
      .select('*')
      .eq('id', worldId)
      .single();

    if (worldError || !world) {
      throw new Error(`World not found: ${worldId}`);
    }

    // Create job record
    const { data: job, error: jobError } = await this.supabase
      .from('dj_world_jobs')
      .insert({
        world_id: worldId,
        status: 'running',
        progress: 0,
        current_phase: 'Starting...',
        characters_generated: 0,
        characters_total: world.character_count,
        logs: ['Job started'],
        started_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (jobError || !job) {
      throw new Error('Failed to create job record');
    }

    // Run generation in background
    this.runGeneration(job.id, world as WorldTemplate).catch(err => {
      console.error('Generation error:', err);
      this.updateJob(job.id, {
        status: 'failed',
        error_message: err.message
      });
    });

    return job.id;
  }

  /**
   * Run the full generation process
   */
  private async runGeneration(jobId: string, world: WorldTemplate): Promise<void> {
    const generator = new CharacterGenerator(world);
    const characters: WorldCharacter[] = [];

    try {
      for (let i = 0; i < world.character_count; i++) {
        const progress = Math.round((i / world.character_count) * 100);

        await this.updateJob(jobId, {
          progress,
          current_phase: `Generating character ${i + 1} of ${world.character_count}`,
          characters_generated: i
        });

        // Generate character
        const character = await generator.generateFullCharacter(characters);

        // Update relationships with previously generated characters
        for (const existing of characters) {
          const newRels = generator.generateRelationships(existing, [character]);
          existing.relationships.push(...newRels);
        }

        characters.push(character);

        // Save character to database
        await this.saveCharacter(character);

        await this.addLog(jobId, `Generated: ${character.name}`);

        // Small delay between characters to avoid rate limits
        await this.delay(1000);
      }

      // Mark complete
      await this.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        current_phase: 'Complete!',
        characters_generated: world.character_count,
        completed_at: new Date().toISOString()
      });

      // Update world status
      await this.supabase
        .from('dj_worlds')
        .update({ status: 'completed' })
        .eq('id', world.id);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.updateJob(jobId, {
        status: 'failed',
        error_message: errorMsg
      });
      throw error;
    }
  }

  /**
   * Save a character to the database
   */
  private async saveCharacter(character: WorldCharacter): Promise<void> {
    await this.supabase
      .from('dj_world_characters')
      .insert({
        id: character.id,
        world_id: character.world_id,
        name: character.name,
        age: character.age,
        gender: character.gender,
        neighborhood: character.neighborhood,
        faction: character.faction,
        social_class: character.social_class,
        profession: character.profession,
        psychology: character.psychology,
        life_events: character.life_events,
        core_memories: character.core_memories,
        elaborations: character.elaborations,
        relationships: character.relationships,
        generation_phase: character.generation_phase,
        created_at: character.created_at
      });
  }

  /**
   * Update job progress
   */
  private async updateJob(
    jobId: string,
    updates: Partial<WorldGenerationJob>
  ): Promise<void> {
    await this.supabase
      .from('dj_world_jobs')
      .update(updates)
      .eq('id', jobId);
  }

  /**
   * Add a log entry
   */
  private async addLog(jobId: string, message: string): Promise<void> {
    const { data: job } = await this.supabase
      .from('dj_world_jobs')
      .select('logs')
      .eq('id', jobId)
      .single();

    const logs = [...(job?.logs || []), message];

    await this.supabase
      .from('dj_world_jobs')
      .update({ logs })
      .eq('id', jobId);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<WorldGenerationJob | null> {
    const { data } = await this.supabase
      .from('dj_world_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    return data as WorldGenerationJob | null;
  }

  /**
   * Get all characters for a world
   */
  async getWorldCharacters(worldId: string): Promise<WorldCharacter[]> {
    const { data } = await this.supabase
      .from('dj_world_characters')
      .select('*')
      .eq('world_id', worldId)
      .order('created_at', { ascending: true });

    return (data || []) as WorldCharacter[];
  }
}

// ============================================
// EXAMPLE WORLD TEMPLATES
// ============================================

export const EXAMPLE_WORLDS: Partial<WorldTemplate>[] = [
  {
    name: "Neo-Tokyo 2150",
    description: "A cyberpunk megacity where corporate power has replaced government",
    era: "Far Future",
    tech_level: "post_scarcity",
    setting_type: "city",
    neighborhoods: [
      {
        name: "Corporate Spires",
        description: "Gleaming towers where the augmented elite live and work",
        social_class: "upper",
        atmosphere: "cold_efficient",
        typical_families: ["corporate dynasties", "tech aristocracy"]
      },
      {
        name: "Market Ring",
        description: "The bustling middle zone of traders, technicians, and service workers",
        social_class: "middle",
        atmosphere: "chaotic_unpredictable",
        typical_families: ["small business owners", "skilled workers"]
      },
      {
        name: "Undercity",
        description: "The forgotten depths where the unaugmented struggle to survive",
        social_class: "lower",
        atmosphere: "tense_walking_eggshells",
        typical_families: ["survival collectives", "gang families"]
      }
    ],
    factions: [
      {
        name: "Nexus Corporation",
        description: "The dominant megacorp controlling most of the city",
        values: ["efficiency", "progress", "control"],
        conflicts_with: ["The Unplugged"],
        typical_roles: ["executive", "security", "researcher"]
      },
      {
        name: "The Unplugged",
        description: "Resistance movement fighting for organic humanity",
        values: ["freedom", "humanity", "nature"],
        conflicts_with: ["Nexus Corporation"],
        typical_roles: ["activist", "medic", "hacker"]
      }
    ],
    social_classes: [
      {
        name: "Augmented Elite",
        description: "The enhanced upper class",
        economic_level: 9,
        mobility: 0.2,
        typical_professions: ["executive", "investor", "designer", "artist"]
      },
      {
        name: "Technical Class",
        description: "Skilled workers and professionals",
        economic_level: 6,
        mobility: 0.4,
        typical_professions: ["engineer", "medic", "trader", "pilot"]
      },
      {
        name: "Organics",
        description: "The unaugmented underclass",
        economic_level: 3,
        mobility: 0.1,
        typical_professions: ["laborer", "vendor", "scavenger", "courier"]
      }
    ],
    key_events: [
      {
        name: "The Blackout of 2120",
        description: "A massive EMP attack that crippled the city for months",
        years_ago: 30,
        impact: "catastrophic",
        affected_groups: ["everyone"],
        trauma_type: "disaster"
      },
      {
        name: "AI Uprising",
        description: "When the city's AI systems briefly went rogue",
        years_ago: 15,
        impact: "major",
        affected_groups: ["Technical Class", "Augmented Elite"],
        trauma_type: "war"
      }
    ],
    cultural_groups: [
      {
        name: "Neo-Japanese",
        description: "Descendants of the original city founders",
        values: { collectivism: 0.7, family_obligation: 0.8, respect_for_elders: 0.6 },
        typical_belonging: "insider"
      },
      {
        name: "Corporate Cosmopolitan",
        description: "The post-national corporate culture",
        values: { collectivism: 0.3, family_obligation: 0.4, respect_for_elders: 0.3 },
        typical_belonging: "insider"
      },
      {
        name: "Migrant Collective",
        description: "Those who fled other collapsed regions",
        values: { collectivism: 0.9, family_obligation: 0.9, respect_for_elders: 0.8 },
        typical_belonging: "outsider"
      }
    ],
    dominant_values: ["efficiency", "enhancement", "survival"],
    character_count: 20,
    relationship_density: "normal"
  }
];
