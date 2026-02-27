// chatbot-message.models.ts

export type MessageRole = 'user' | 'bot';
export type MessageType = 'text' | 'card' | 'list' | 'form';

/**
 * Modèle BASE DE DONNÉES — stocké en MongoDB.
 * Champ principal : content (pas text)
 */
export interface ChatMessage {
text: string;
isTyping: any;
  role:             MessageRole;
  content:          string;
  timestamp:        Date;
  intentMatched?:   string;
  confidenceScore?: number;
}

/**
 * Modèle API — retourné par le backend dans ChatResponse.
 */
export interface BotMessage {
  text:      string;
  type:      MessageType;
  payload?:  unknown;
  timestamp: Date;
}

/**
 * Modèle AFFICHAGE — utilisé uniquement par le widget Angular.
 * Unifie user + bot + indicateur de frappe dans une seule liste.
 */
export interface UIMessage {
  role:      MessageRole;
  text:      string;       // texte affiché (= content côté DB, = text côté API)
  timestamp: Date;
  isTyping?: boolean;      // true = afficher l'animation "..."
  type?:     MessageType;
  payload?:  unknown;
}
