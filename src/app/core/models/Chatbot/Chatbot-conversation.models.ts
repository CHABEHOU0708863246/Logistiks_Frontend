// ─── Enums ───────────────────────────────────────────────────────────────────

import { ChatMessage } from "./Chatbot-message.models";

/** Statut de la conversation. Correspond à C# : enum ConversationStatus */
export enum ConversationStatus {
  Active    = 'Active',
  Closed    = 'Closed',
  Escalated = 'Escalated',
}

// ─── Types ───────────────────────────────────────────────────────────────────

/** Canal d'accès */
export type ConversationChannel = 'web' | 'mobile' | 'api';

/**
 * Flux guidé actif dans la conversation.
 * null = pas de flux → détection d'intention libre
 */
export type ConversationFlow =
  | 'lead_capture'
  | 'collect_bug_info'
  | 'collect_email_only'
  | null;

// ─── Interfaces ──────────────────────────────────────────────────────────────

/**
 * Informations du lead capturé pendant la conversation.
 * Correspond à C# : LeadInfo
 */
export interface LeadInfo {
  name?:        string;
  email?:       string;
  phone?:       string;
  company?:     string;
  need?:        string;
  capturedAt:   Date;
}

/**
 * Session de conversation complète (modèle MongoDB).
 * Correspond à C# : Conversation
 */
export interface Conversation {
  id:               string;          // MongoDB ObjectId
  sessionId:        string;          // UUID unique par session
  channel:          ConversationChannel;
  status:           ConversationStatus;
  messages:         ChatMessage[];
  lead?:            LeadInfo;
  startedAt:        Date;
  lastActivityAt:   Date;
  escalatedToHuman: boolean;
  fallbackCount:    number;          // nb de fois non compris
  currentFlow?:     ConversationFlow;
  context:          Record<string, string>; // données collectées dans le flux
}
