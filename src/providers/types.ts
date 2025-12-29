/**
 * Core interfaces for the Intent Provider system.
 * 
 * Intent Providers normalize intent artifacts from different AI coding assistants
 * into a common schema that can be used for generating commit messages and PR descriptions.
 */

/**
 * Normalized intent data collected from an AI coding assistant.
 */
export interface IntentBundle {
  /** High-level goals or objectives mentioned in the session */
  goals?: string[];
  
  /** Specific tasks or checklist items */
  tasks?: string[];
  
  /** Design decisions or architectural choices made */
  decisions?: string[];
  
  /** Trade-offs, caveats, or considerations mentioned */
  tradeoffs?: string[];
  
  /** Constraints or requirements to be aware of */
  constraints?: string[];
  
  /** Raw notes or additional context that doesn't fit other categories */
  rawNotes?: string;
  
  /** Confidence score (0-1) indicating quality/completeness of intent data */
  confidence: number;
  
  /** Name of the provider that collected this intent */
  source: string;
}

/**
 * Interface that all intent providers must implement.
 * 
 * Providers are responsible for:
 * 1. Detecting if their AI assistant's artifacts are present
 * 2. Collecting and normalizing intent data into an IntentBundle
 */
export interface IntentProvider {
  /** Unique name identifying this provider */
  name: string;
  
  /**
   * Detect if this provider's AI assistant artifacts are present.
   * Should be fast and non-destructive (read-only checks).
   * 
   * @returns true if artifacts are detected, false otherwise
   */
  detect(): Promise<boolean>;
  
  /**
   * Collect intent data from the AI assistant's artifacts.
   * Only called if detect() returns true.
   * 
   * @returns IntentBundle with normalized intent data, or null if collection fails
   */
  collect(): Promise<IntentBundle | null>;
}
