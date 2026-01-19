#!/usr/bin/env node

/**
 * World Builder MCP Server
 *
 * Exposes world-building tools via Model Context Protocol.
 * Use from Claude.ai, Claude Code, or any MCP-compatible client.
 *
 * Tools:
 * - create_world: Create a new world template
 * - list_worlds: List all worlds and their status
 * - get_world: Get details of a specific world
 * - start_generation: Start overnight character generation
 * - check_progress: Check generation job progress
 * - get_characters: Get generated characters for a world
 * - create_quick_world: Create a world from a simple description (AI-assisted)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================
// CONFIGURATION
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
const API_BASE_URL = process.env.WORLD_BUILDER_API_URL || "http://localhost:3000";

function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY environment variables required");
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ============================================
// TOOL DEFINITIONS
// ============================================

const TOOLS: Tool[] = [
  {
    name: "create_world",
    description: "Create a new world template for character generation. Define neighborhoods, factions, social classes, and historical events.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the world (e.g., 'Neo-Tokyo 2150', 'Victorian London')"
        },
        description: {
          type: "string",
          description: "Brief description of the world"
        },
        era: {
          type: "string",
          description: "Time period (e.g., 'Far Future', 'Victorian', 'Fantasy Medieval', '1920s')"
        },
        setting_type: {
          type: "string",
          enum: ["city", "town", "region", "station", "colony"],
          description: "Type of setting"
        },
        neighborhoods: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              social_class: { type: "string", enum: ["upper", "middle", "lower", "mixed"] },
              atmosphere: { type: "string" }
            },
            required: ["name", "social_class"]
          },
          description: "Districts/areas within the world"
        },
        factions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              values: { type: "array", items: { type: "string" } }
            },
            required: ["name"]
          },
          description: "Groups/organizations in the world"
        },
        social_classes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              economic_level: { type: "number", minimum: 1, maximum: 10 },
              typical_professions: { type: "array", items: { type: "string" } }
            },
            required: ["name", "typical_professions"]
          },
          description: "Social strata in the world"
        },
        key_events: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              years_ago: { type: "number" },
              impact: { type: "string", enum: ["minor", "major", "catastrophic"] }
            },
            required: ["name", "years_ago"]
          },
          description: "Historical events that shaped the world"
        },
        character_count: {
          type: "number",
          description: "Number of characters to generate (default: 20)",
          default: 20
        }
      },
      required: ["name", "era", "neighborhoods", "social_classes"]
    }
  },
  {
    name: "create_quick_world",
    description: "Create a world from a simple text description. The system will generate the full template automatically.",
    inputSchema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Natural language description of the world you want (e.g., 'A cyberpunk megacity with corporate overlords and an underground resistance')"
        },
        character_count: {
          type: "number",
          description: "Number of characters to generate (default: 20)",
          default: 20
        }
      },
      required: ["description"]
    }
  },
  {
    name: "list_worlds",
    description: "List all worlds and their current status",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["all", "draft", "approved", "generating", "completed", "failed"],
          description: "Filter by status (default: all)"
        }
      }
    }
  },
  {
    name: "get_world",
    description: "Get full details of a specific world including its template",
    inputSchema: {
      type: "object",
      properties: {
        world_id: {
          type: "string",
          description: "UUID of the world"
        },
        world_name: {
          type: "string",
          description: "Name of the world (alternative to world_id)"
        }
      }
    }
  },
  {
    name: "approve_world",
    description: "Approve a world template for character generation",
    inputSchema: {
      type: "object",
      properties: {
        world_id: {
          type: "string",
          description: "UUID of the world to approve"
        }
      },
      required: ["world_id"]
    }
  },
  {
    name: "start_generation",
    description: "Start overnight character generation for an approved world. This kicks off a background job that generates deeply layered characters.",
    inputSchema: {
      type: "object",
      properties: {
        world_id: {
          type: "string",
          description: "UUID of the approved world"
        }
      },
      required: ["world_id"]
    }
  },
  {
    name: "check_progress",
    description: "Check the progress of a character generation job",
    inputSchema: {
      type: "object",
      properties: {
        job_id: {
          type: "string",
          description: "UUID of the generation job"
        },
        world_id: {
          type: "string",
          description: "UUID of the world (alternative - gets latest job)"
        }
      }
    }
  },
  {
    name: "get_characters",
    description: "Get all generated characters for a completed world",
    inputSchema: {
      type: "object",
      properties: {
        world_id: {
          type: "string",
          description: "UUID of the world"
        },
        include_psychology: {
          type: "boolean",
          description: "Include full 8-layer psychology (default: false for brevity)"
        },
        include_elaborations: {
          type: "boolean",
          description: "Include AI-generated elaborations (default: true)"
        }
      },
      required: ["world_id"]
    }
  },
  {
    name: "get_character",
    description: "Get full details of a specific character",
    inputSchema: {
      type: "object",
      properties: {
        character_id: {
          type: "string",
          description: "ID of the character"
        }
      },
      required: ["character_id"]
    }
  },
  {
    name: "export_to_loomiverse",
    description: "Export characters to Loomiverse-compatible format",
    inputSchema: {
      type: "object",
      properties: {
        world_id: {
          type: "string",
          description: "UUID of the world to export"
        }
      },
      required: ["world_id"]
    }
  }
];

// ============================================
// TOOL HANDLERS
// ============================================

async function handleCreateWorld(args: Record<string, unknown>) {
  const supabase = getSupabase();

  const world = {
    name: args.name as string,
    description: args.description as string || null,
    era: args.era as string,
    setting_type: args.setting_type as string || "city",
    neighborhoods: args.neighborhoods || [],
    factions: args.factions || [],
    social_classes: args.social_classes || [],
    key_events: args.key_events || [],
    cultural_groups: args.cultural_groups || [],
    dominant_values: args.dominant_values || [],
    character_count: (args.character_count as number) || 20,
    relationship_density: "normal",
    status: "draft"
  };

  const { data, error } = await supabase
    .from("dj_worlds")
    .insert(world)
    .select("id, name, status, character_count")
    .single();

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    world: data,
    message: `Created world "${data.name}" with ${data.character_count} characters planned. Use approve_world to approve it, then start_generation to begin.`
  };
}

async function handleCreateQuickWorld(args: Record<string, unknown>) {
  // This creates a minimal world template from a description
  // In a full implementation, this would call Claude to generate the full template
  const description = args.description as string;
  const characterCount = (args.character_count as number) || 20;

  // Parse some basics from the description
  const isSciFi = /cyber|future|space|tech|android|robot|ai|colony|station/i.test(description);
  const isFantasy = /magic|medieval|kingdom|dragon|elf|wizard|sword/i.test(description);
  const isHistorical = /victorian|1800|1900|1920|war|colonial|western/i.test(description);

  let era = "Contemporary";
  if (isSciFi) era = "Far Future";
  if (isFantasy) era = "Fantasy Medieval";
  if (isHistorical) era = "Historical";

  const supabase = getSupabase();

  const world = {
    name: `Quick World - ${new Date().toISOString().slice(0, 10)}`,
    description: description,
    era: era,
    setting_type: "city",
    neighborhoods: [
      { name: "Upper District", social_class: "upper", atmosphere: "cold_efficient" },
      { name: "Central District", social_class: "middle", atmosphere: "functional_distant" },
      { name: "Lower District", social_class: "lower", atmosphere: "chaotic_unpredictable" }
    ],
    factions: [],
    social_classes: [
      { name: "Elite", economic_level: 9, typical_professions: ["executive", "politician", "artist"] },
      { name: "Working Class", economic_level: 5, typical_professions: ["worker", "merchant", "technician"] },
      { name: "Underclass", economic_level: 2, typical_professions: ["laborer", "servant", "street vendor"] }
    ],
    key_events: [],
    cultural_groups: [
      { name: "Dominant Culture", typical_belonging: "insider" },
      { name: "Minority Culture", typical_belonging: "outsider" }
    ],
    character_count: characterCount,
    status: "draft"
  };

  const { data, error } = await supabase
    .from("dj_worlds")
    .insert(world)
    .select("id, name, status, character_count")
    .single();

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    world: data,
    message: `Created quick world from description. Use get_world to see the template, modify if needed, then approve_world and start_generation.`,
    note: "For more detailed worlds, use create_world with full template."
  };
}

async function handleListWorlds(args: Record<string, unknown>) {
  const supabase = getSupabase();
  const status = args.status as string;

  let query = supabase
    .from("dj_worlds")
    .select("id, name, era, character_count, status, created_at")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return { error: error.message };
  }

  return {
    worlds: data,
    count: data?.length || 0
  };
}

async function handleGetWorld(args: Record<string, unknown>) {
  const supabase = getSupabase();

  let query = supabase.from("dj_worlds").select("*");

  if (args.world_id) {
    query = query.eq("id", args.world_id);
  } else if (args.world_name) {
    query = query.ilike("name", `%${args.world_name}%`);
  } else {
    return { error: "Provide world_id or world_name" };
  }

  const { data, error } = await query.single();

  if (error) {
    return { error: error.message };
  }

  return { world: data };
}

async function handleApproveWorld(args: Record<string, unknown>) {
  const supabase = getSupabase();
  const worldId = args.world_id as string;

  const { data, error } = await supabase
    .from("dj_worlds")
    .update({ status: "approved" })
    .eq("id", worldId)
    .select("id, name, status")
    .single();

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    world: data,
    message: `World "${data.name}" approved. Use start_generation to begin character creation.`
  };
}

async function handleStartGeneration(args: Record<string, unknown>) {
  const worldId = args.world_id as string;

  try {
    const response = await fetch(`${API_BASE_URL}/api/start-world-build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worldId })
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || "Failed to start generation" };
    }

    return {
      success: true,
      job_id: result.jobId,
      message: result.message,
      note: "Generation will run in the background. Use check_progress to monitor."
    };
  } catch (e) {
    return {
      error: `Failed to connect to API at ${API_BASE_URL}. Make sure the dashboard is running.`,
      details: e instanceof Error ? e.message : String(e)
    };
  }
}

async function handleCheckProgress(args: Record<string, unknown>) {
  const supabase = getSupabase();

  let query = supabase.from("dj_world_jobs").select("*");

  if (args.job_id) {
    query = query.eq("id", args.job_id);
  } else if (args.world_id) {
    query = query.eq("world_id", args.world_id).order("created_at", { ascending: false }).limit(1);
  } else {
    // Get all active jobs
    const { data } = await supabase
      .from("dj_world_jobs")
      .select("*")
      .in("status", ["queued", "running"])
      .order("created_at", { ascending: false });

    return { active_jobs: data, count: data?.length || 0 };
  }

  const { data, error } = await query.single();

  if (error) {
    return { error: error.message };
  }

  return {
    job: {
      id: data.id,
      world_id: data.world_id,
      status: data.status,
      progress: data.progress,
      current_phase: data.current_phase,
      characters_generated: data.characters_generated,
      characters_total: data.characters_total,
      current_character: data.current_character,
      started_at: data.started_at,
      completed_at: data.completed_at,
      error_message: data.error_message
    },
    recent_logs: data.logs?.slice(-5) || []
  };
}

async function handleGetCharacters(args: Record<string, unknown>) {
  const supabase = getSupabase();
  const worldId = args.world_id as string;
  const includePsychology = args.include_psychology as boolean || false;
  const includeElaborations = args.include_elaborations !== false;

  let selectFields = "id, name, age, gender, neighborhood, faction, social_class, profession, generation_phase";

  if (includePsychology) {
    selectFields += ", psychology";
  }
  if (includeElaborations) {
    selectFields += ", elaborations";
  }

  const { data, error } = await supabase
    .from("dj_world_characters")
    .select(selectFields)
    .eq("world_id", worldId)
    .order("created_at", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return {
    characters: data,
    count: data?.length || 0
  };
}

async function handleGetCharacter(args: Record<string, unknown>) {
  const supabase = getSupabase();
  const characterId = args.character_id as string;

  const { data, error } = await supabase
    .from("dj_world_characters")
    .select("*")
    .eq("id", characterId)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { character: data };
}

async function handleExportToLoomiverse(args: Record<string, unknown>) {
  const supabase = getSupabase();
  const worldId = args.world_id as string;

  // Get all characters
  const { data: characters, error } = await supabase
    .from("dj_world_characters")
    .select("*")
    .eq("world_id", worldId);

  if (error) {
    return { error: error.message };
  }

  // Convert to Loomiverse format
  const loomiverseCharacters = characters?.map(char => ({
    id: char.id,
    name: char.name,
    // Map to Loomiverse's expected structure
    world: char.psychology?.world_context,
    cultural_identity: char.psychology?.cultural_identity,
    generational_echoes: char.psychology?.generational_echoes,
    family: char.psychology?.family,
    atmospheric_conditions: char.psychology?.atmospheric_conditions,
    biology: char.psychology?.biology,
    embodiment: char.psychology?.embodiment,
    attachment: char.psychology?.attachment,
    simulation_results: {
      events: char.life_events,
      core_memories: char.core_memories
    },
    elaborations: char.elaborations,
    // Metadata
    source: "world-builder",
    source_world: worldId
  }));

  return {
    format: "loomiverse",
    characters: loomiverseCharacters,
    count: loomiverseCharacters?.length || 0,
    note: "These can be imported into Loomiverse using the character import feature."
  };
}

// ============================================
// MAIN SERVER
// ============================================

async function main() {
  const server = new Server(
    {
      name: "world-builder",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
        case "create_world":
          result = await handleCreateWorld(args || {});
          break;
        case "create_quick_world":
          result = await handleCreateQuickWorld(args || {});
          break;
        case "list_worlds":
          result = await handleListWorlds(args || {});
          break;
        case "get_world":
          result = await handleGetWorld(args || {});
          break;
        case "approve_world":
          result = await handleApproveWorld(args || {});
          break;
        case "start_generation":
          result = await handleStartGeneration(args || {});
          break;
        case "check_progress":
          result = await handleCheckProgress(args || {});
          break;
        case "get_characters":
          result = await handleGetCharacters(args || {});
          break;
        case "get_character":
          result = await handleGetCharacter(args || {});
          break;
        case "export_to_loomiverse":
          result = await handleExportToLoomiverse(args || {});
          break;
        default:
          return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("World Builder MCP server running");
}

main().catch(console.error);
