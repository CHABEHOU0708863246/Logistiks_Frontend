import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { QuickReply } from '../../models/Chatbot/Chatbot-intent.models';
import { ChatMessage, UIMessage } from '../../models/Chatbot/Chatbot-message.models';
import { Chatbot } from '../../services/Chatbot/chatbot';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Particule de décor neural
interface NeuralParticle {
  x:     number;  // % horizontal
  y:     number;  // % vertical
  size:  number;  // px
  delay: number;  // s
}

@Component({
  selector: 'app-chatbot-widget',
  imports: [CommonModule,
    FormsModule,
    RouterModule],
  templateUrl: './chatbot-widget.html',
  styleUrl: './chatbot-widget.scss',
})
export class ChatbotWidget implements OnInit, AfterViewChecked {

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLElement>;

  // ── État ────────────────────────────────────────────────────────────────
  messages:        UIMessage[] = [];
  quickReplies:    { label: string; value: string; icon?: string }[] = [];
  isOpen           = false;
  isTyping         = false;
  hasNewMessage    = false;
  showHumanHandoff = false;
  inputText        = '';

  // Particules décoratives générées une seule fois
  neuralParticles: NeuralParticle[] = [];

  private shouldScrollToBottom = false;

  constructor(private chatbotSvc: Chatbot) {}

  ngOnInit(): void {
    // Générer les particules neural
    this.neuralParticles = Array.from({ length: 18 }, () => ({
      x:     Math.random() * 100,
      y:     Math.random() * 100,
      size:  Math.random() * 4 + 2,
      delay: Math.random() * 6
    }));

    // Souscrire aux observables du service
    this.chatbotSvc.messages$.subscribe(msgs => {
      this.messages = msgs;
      this.shouldScrollToBottom = true;
      // Notifier si le chat est fermé
      if (!this.isOpen && msgs.length > 0) {
        this.hasNewMessage = true;
      }
    });

    this.chatbotSvc.quickReplies$.subscribe(qr => this.quickReplies = qr);

    this.chatbotSvc.isTyping$.subscribe(t => this.isTyping = t);

    this.chatbotSvc.showHumanHandoff$.subscribe(h => this.showHumanHandoff = h);

    // ─── FIX BUG 2 : synchroniser isOpen depuis le service ─────────────
    // On s'abonne à isOpen$ du service pour que le template reflète
    // toujours l'état réel, même sur fond blanc (dashboard après login)
    this.chatbotSvc.isOpen$.subscribe(open => {
      this.isOpen = open;
      if (open) {
        this.hasNewMessage = false;
        // Initialiser la session si aucun message
        if (this.messages.length === 0) {
          this.chatbotSvc.initSession();
        }
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  /**
   * FIX BUG 3 : méthode dédiée pour ouvrir/fermer.
   * Le template appelle TOUJOURS une méthode du composant,
   * jamais directement chatbotSvc.toggleChat() qui peut
   * avoir des problèmes de binding dans le contexte du template.
   */
  toggleChat(): void {
    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  openChat(): void {
    this.chatbotSvc.isOpen$.next(true);
  }

  /** FIX BUG 3 : méthode closeChat() explicite utilisée par la croix du header */
  closeChat(): void {
    this.chatbotSvc.isOpen$.next(false);
  }

  async sendMessage(): Promise<void> {
    const text = this.inputText.trim();
    if (!text || this.isTyping) return;
    this.inputText = '';
    await this.chatbotSvc.sendMessage(text);
  }

  async clickQuickReply(qr: { label: string; value: string }): Promise<void> {
    await this.chatbotSvc.sendMessage(qr.label, qr.value);
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /** Formate le markdown simple : **gras** → <strong>, _italique_ → <em>, \n → <br> */
  formatText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,     '<em>$1</em>')
      .replace(/_(.*?)_/g,       '<em>$1</em>')
      .replace(/\n/g,            '<br>');
  }

  // ── Privé ────────────────────────────────────────────────────────────────
  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { /* silencieux */ }
  }
}




















































































