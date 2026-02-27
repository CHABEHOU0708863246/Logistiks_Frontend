import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';
export interface ChatMessage { role: 'user' | 'bot'; text: string; timestamp: Date; isTyping?: boolean; }
export interface QuickReply { label: string; value: string; icon?: string; }
export interface ChatResponse { sessionId: string; messages: {text:string,type:string}[]; quickReplies: QuickReply[]; showHumanHandoff: boolean; }


@Injectable({
  providedIn: 'root',
})
export class Chatbot {
  private apiUrl = `${environment.apiUrl}/api/chatbot`;;
  private sessionId: string | null = null;

  // Observables pour le widget
  messages$ = new BehaviorSubject<ChatMessage[]>([]);
  quickReplies$ = new BehaviorSubject<QuickReply[]>([]);
  isOpen$ = new BehaviorSubject<boolean>(false);
  isTyping$ = new BehaviorSubject<boolean>(false);
  showHumanHandoff$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {}

  async initSession() {
    const res = await this.http.post<ChatResponse>(
      `${this.apiUrl}/welcome`, {}).toPromise();
    this.handleResponse(res!);
  }

  async sendMessage(text: string, quickReplyValue?: string) {
    // Ajouter message utilisateur immédiatement
    this.addMessage({ role: 'user', text, timestamp: new Date() });
    this.quickReplies$.next([]);

    // Afficher indicateur de frappe
    this.isTyping$.next(true);
    this.addMessage({ role: 'bot', text: '...', timestamp: new Date(), isTyping: true });

    try {
      const res = await this.http.post<ChatResponse>(`${this.apiUrl}/message`, {
        message: text,
        sessionId: this.sessionId,
        quickReplyValue
      }).toPromise();

      // Supprimer l'indicateur de frappe
      const msgs = this.messages$.value.filter(m => !m.isTyping);
      this.messages$.next(msgs);
      this.isTyping$.next(false);

      this.handleResponse(res!);
    } catch {
      this.isTyping$.next(false);
      const msgs = this.messages$.value.filter(m => !m.isTyping);
      this.messages$.next(msgs);
      this.addMessage({
        role: 'bot',
        text: '❌ Connexion perdue. Veuillez réessayer.',
        timestamp: new Date()
      });
    }
  }

  private handleResponse(res: ChatResponse) {
    this.sessionId = res.sessionId;
    res.messages.forEach(m => {
      this.addMessage({ role: 'bot', text: m.text, timestamp: new Date() });
    });
    this.quickReplies$.next(res.quickReplies || []);
    this.showHumanHandoff$.next(res.showHumanHandoff);
  }

  private addMessage(msg: ChatMessage) {
    this.messages$.next([...this.messages$.value, msg]);
  }

  toggleChat() { this.isOpen$.next(!this.isOpen$.value); }
  openChat() { this.isOpen$.next(true); }
}
