
// ─── Requête ─────────────────────────────────────────────────────────────────

import { ConversationFlow } from "./Chatbot-conversation.models";
import { QuickReply } from "./Chatbot-intent.models";
import { BotMessage } from "./Chatbot-message.models";

/**
 * Corps de la requête POST /api/chatbot/message.
 * Correspond à C# : ChatRequest
 */
export interface ChatRequest {
  message:          string;
  sessionId?:       string;  // undefined = nouvelle session
  channel?:         string;  // défaut : "web"
  quickReplyValue?: string;  // valeur du bouton cliqué (optionnel)
}

// ─── Réponse ─────────────────────────────────────────────────────────────────

/**
 * Réponse du backend après traitement d'un message.
 * Correspond à C# : ChatResponse
 */
export interface ChatResponse {
  sessionId:        string;
  messages:         BotMessage[];
  quickReplies:     QuickReply[];   // QuickReplyDto fusionné avec QuickReply
  showHumanHandoff: boolean;        // afficher la bannière de transfert humain
  currentFlow?:     ConversationFlow;
  isTyping:         boolean;
}
