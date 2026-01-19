/**
 * Bird CLI Client
 *
 * Wrapper for the bird CLI tool that fetches Twitter/X content
 * using browser cookies (no API key needed).
 *
 * Prerequisites:
 * - bird CLI installed: npm install -g @steipete/bird
 * - Logged into Twitter in Safari/Chrome/Firefox
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface Tweet {
  id: string;
  text: string;
  author: {
    username: string;
    name: string;
    followers: number;
  };
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
  };
  created_at: string;
  media?: Array<{
    type: string;
    url: string;
  }>;
}

export interface Reply extends Tweet {
  in_reply_to_id: string;
}

export interface TweetWithReplies {
  tweet: Tweet;
  replies: Reply[];
  insights: {
    total_replies: number;
    links_found: string[];
    repos_mentioned: string[];
    suggestions: string[];
  };
}

/**
 * Check if bird CLI is installed and authenticated
 */
export async function checkBirdStatus(): Promise<{
  installed: boolean;
  authenticated: boolean;
  username?: string;
}> {
  try {
    const { stdout } = await execAsync("bird whoami --json");
    const data = JSON.parse(stdout);
    return {
      installed: true,
      authenticated: true,
      username: data.username,
    };
  } catch (error) {
    // Check if bird is installed but not authenticated
    try {
      await execAsync("bird --version");
      return { installed: true, authenticated: false };
    } catch {
      return { installed: false, authenticated: false };
    }
  }
}

/**
 * Read a single tweet by URL
 */
export async function readTweet(url: string): Promise<Tweet> {
  const { stdout } = await execAsync(`bird read "${url}" --json`);
  return JSON.parse(stdout);
}

/**
 * Get replies to a tweet
 */
export async function getReplies(
  url: string,
  maxPages: number = 3
): Promise<Reply[]> {
  const { stdout } = await execAsync(
    `bird replies "${url}" --max-pages ${maxPages} --json`
  );
  return JSON.parse(stdout);
}

/**
 * Get user's bookmarks
 */
export async function getBookmarks(count: number = 10): Promise<Tweet[]> {
  const { stdout } = await execAsync(`bird bookmarks -n ${count} --json`);
  return JSON.parse(stdout);
}

/**
 * Extract insights from replies
 */
function extractInsights(replies: Reply[]): TweetWithReplies["insights"] {
  const links: string[] = [];
  const repos: string[] = [];
  const suggestions: string[] = [];

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const githubRegex = /github\.com\/[\w-]+\/[\w-]+/g;
  const suggestionPhrases = [
    "you could",
    "would be better",
    "try using",
    "i built",
    "here's my",
    "check out",
    "alternative",
  ];

  for (const reply of replies) {
    // Extract URLs
    const urls = reply.text.match(urlRegex) || [];
    links.push(...urls);

    // Extract GitHub repos
    const githubUrls = reply.text.match(githubRegex) || [];
    repos.push(...githubUrls.map((r) => `https://${r}`));

    // Find suggestions
    const lowerText = reply.text.toLowerCase();
    for (const phrase of suggestionPhrases) {
      if (lowerText.includes(phrase)) {
        suggestions.push(reply.text);
        break;
      }
    }
  }

  return {
    total_replies: replies.length,
    links_found: [...new Set(links)],
    repos_mentioned: [...new Set(repos)],
    suggestions: suggestions.slice(0, 10), // Top 10 suggestions
  };
}

/**
 * Capture a tweet with all its replies and extract insights
 * This is the main function you'll use
 */
export async function captureTweet(url: string): Promise<TweetWithReplies> {
  // Fetch tweet and replies in parallel
  const [tweet, replies] = await Promise.all([
    readTweet(url),
    getReplies(url, 5), // Get up to 5 pages of replies
  ]);

  // Extract insights from replies
  const insights = extractInsights(replies);

  return {
    tweet,
    replies,
    insights,
  };
}

/**
 * Example usage:
 *
 * const result = await captureTweet('https://x.com/user/status/123...');
 * console.log(result.insights.repos_mentioned); // GitHub repos from comments
 * console.log(result.insights.suggestions); // Helpful suggestions from replies
 */
