
// ─── Types ───────────────────────────────────────────────────────────────────

import { BotMessage } from "./Chatbot-message.models";

/** Catégorie métier de l'intention */
export type IntentCategory = 'faq' | 'sav' | 'lead' | 'navigation';

// ─── Interfaces ──────────────────────────────────────────────────────────────

/**
 * Bouton de réponse rapide (chip cliquable).
 * Fusion de C# : QuickReply + QuickReplyDto (identiques)
 */
export interface QuickReply {
  label: string;   // texte affiché sur le bouton
  value: string;   // valeur envoyée au backend au clic
  icon?: string;   // optionnel : icône boxicons (ex: "bx-chat")
}

/**
 * Intention de la base de connaissances (modèle MongoDB).
 * Correspond à C# : Intent
 */
export interface Intent {
  id:              string;        // MongoDB ObjectId
  name:            string;        // ex: "faq_prix", "sav_login"
  category:        IntentCategory;
  description:     string;
  trainingPhrases: string[];      // phrases d'entraînement NLP
  keywords:        string[];      // mots-clés déclencheurs
  responses:       BotMessage[];  // réponses possibles (une choisie aléatoirement)
  nextFlow?:       string;        // flux à démarrer si match
  quickReplies:    QuickReply[];  // boutons affichés après la réponse
  priority:        number;        // priorité si plusieurs matches (0 = plus bas)
  isActive:        boolean;
}
