import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    console.log(`🔗 API URL configurée: ${this.apiUrl}`);
  }

  // Méthode helper pour construire les URLs
  getApiUrl(endpoint: string): string {
    // Enlève le slash initial si présent
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    return `${this.apiUrl}/${cleanEndpoint}`;
  }

  // Exemple d'utilisation
  get<T>(endpoint: string) {
    return this.http.get<T>(this.getApiUrl(endpoint));
  }

  post<T>(endpoint: string, data: any) {
    return this.http.post<T>(this.getApiUrl(endpoint), data);
  }

  put<T>(endpoint: string, data: any) {
    return this.http.put<T>(this.getApiUrl(endpoint), data);
  }

  delete<T>(endpoint: string) {
    return this.http.delete<T>(this.getApiUrl(endpoint));
  }
}
