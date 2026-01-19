import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponseData } from '../../models/Common/ApiResponseData';
import { VehicleType, VehicleStatus } from '../../models/Enums/Logistiks-enums';
import { VehicleUsage } from '../../models/Vehicles/Vehicle-usage.models';
import { CreateVehicleRequest, VehicleDto, VehicleSearchCriteria, UpdateVehicleRequest, AssignVehicleRequest, VehicleStatistics } from '../../models/Vehicles/Vehicle.dtos';

@Injectable({
  providedIn: 'root',
})
export class Vehicles {
  private readonly baseUrl = `${environment.apiUrl}/api/v1/Vehicles`;

  constructor(private http: HttpClient) {}

  // ============================================
  // GESTION DE BASE (CRUD)
  // ============================================

  /**
   * Créer un nouveau véhicule dans le parc
   * POST /api/v1/Vehicles
   */
  createVehicle(request: CreateVehicleRequest): Observable<ApiResponseData<VehicleDto>> {
    return this.http
      .post<ApiResponseData<VehicleDto>>(`${this.baseUrl}`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtenir un véhicule par son ID
   * GET /api/v1/Vehicles/{id}
   */
  getVehicleById(vehicleId: string): Observable<ApiResponseData<VehicleDto>> {
    return this.http
      .get<ApiResponseData<VehicleDto>>(`${this.baseUrl}/${vehicleId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtenir un véhicule par son code (ex: MOTO-001)
   * GET /api/v1/Vehicles/by-code/{code}
   */
  getVehicleByCode(code: string): Observable<ApiResponseData<VehicleDto>> {
    return this.http
      .get<ApiResponseData<VehicleDto>>(`${this.baseUrl}/by-code/${code}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtenir un véhicule par sa plaque d'immatriculation
   * GET /api/v1/Vehicles/by-plate/{plateNumber}
   */
  getVehicleByPlateNumber(plateNumber: string): Observable<ApiResponseData<VehicleDto>> {
    return this.http
      .get<ApiResponseData<VehicleDto>>(`${this.baseUrl}/by-plate/${plateNumber}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Rechercher des véhicules avec filtres avancés et pagination
   * GET /api/v1/Vehicles/search
   */
  searchVehicles(criteria: VehicleSearchCriteria): Observable<ApiResponseData<VehicleDto[]>> {
    let params = new HttpParams()
      .set('page', criteria.page.toString())
      .set('pageSize', criteria.pageSize.toString())
      .set('sortDescending', criteria.sortDescending.toString());

    if (criteria.searchTerm) {
      params = params.set('searchTerm', criteria.searchTerm);
    }
    if (criteria.type !== undefined && criteria.type !== null) {
      params = params.set('type', criteria.type.toString());
    }
    if (criteria.status !== undefined && criteria.status !== null) {
      params = params.set('status', criteria.status.toString());
    }
    if (criteria.fuelType !== undefined && criteria.fuelType !== null) {
      params = params.set('fuelType', criteria.fuelType.toString());
    }
    if (criteria.minYear) {
      params = params.set('minYear', criteria.minYear.toString());
    }
    if (criteria.maxYear) {
      params = params.set('maxYear', criteria.maxYear.toString());
    }
    if (criteria.minAcquisitionCost) {
      params = params.set('minAcquisitionCost', criteria.minAcquisitionCost.toString());
    }
    if (criteria.maxAcquisitionCost) {
      params = params.set('maxAcquisitionCost', criteria.maxAcquisitionCost.toString());
    }
    if (criteria.hasExpiredInsurance !== undefined) {
      params = params.set('hasExpiredInsurance', criteria.hasExpiredInsurance.toString());
    }
    if (criteria.sortBy) {
      params = params.set('sortBy', criteria.sortBy);
    }

    return this.http
      .get<ApiResponseData<VehicleDto[]>>(`${this.baseUrl}/search`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Mettre à jour les informations d'un véhicule
   * PUT /api/v1/Vehicles/{id}
   */
  updateVehicle(vehicleId: string, request: UpdateVehicleRequest): Observable<ApiResponseData<VehicleDto>> {
    return this.http
      .put<ApiResponseData<VehicleDto>>(`${this.baseUrl}/${vehicleId}`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Supprimer (soft delete) un véhicule du parc
   * DELETE /api/v1/Vehicles/{id}
   */
  deleteVehicle(vehicleId: string): Observable<Response> {
    return this.http
      .delete<Response>(`${this.baseUrl}/${vehicleId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // ============================================
  // RECHERCHE ET CONSULTATION
  // ============================================

  /**
   * Obtenir la liste des véhicules disponibles pour location
   * GET /api/v1/Vehicles/available
   */
  getAvailableVehicles(vehicleType?: VehicleType): Observable<ApiResponseData<VehicleDto[]>> {
    let params = new HttpParams();
    if (vehicleType !== undefined && vehicleType !== null) {
      params = params.set('vehicleType', vehicleType.toString());
    }

    return this.http
      .get<ApiResponseData<VehicleDto[]>>(`${this.baseUrl}/available`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtenir la liste des véhicules actuellement loués
   * GET /api/v1/Vehicles/rented
   */
  getRentedVehicles(): Observable<ApiResponseData<VehicleDto[]>> {
    return this.http
      .get<ApiResponseData<VehicleDto[]>>(`${this.baseUrl}/rented`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtenir la liste des véhicules en maintenance
   * GET /api/v1/Vehicles/maintenance
   */
  getVehiclesInMaintenance(): Observable<ApiResponseData<VehicleDto[]>> {
    return this.http
      .get<ApiResponseData<VehicleDto[]>>(`${this.baseUrl}/maintenance`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // ============================================
  // GESTION DU STATUT & DISPONIBILITÉ
  // ============================================

  /**
   * Changer le statut d'un véhicule (Disponible, Maintenance, Hors service, etc.)
   * POST /api/v1/Vehicles/{id}/change-status/{status}
   */
  changeVehicleStatus(
    vehicleId: string,
    newStatus: VehicleStatus,
    reason?: string
  ): Observable<Response> {
    let params = new HttpParams();
    if (reason) {
      params = params.set('reason', reason);
    }

    return this.http
      .post<Response>(`${this.baseUrl}/${vehicleId}/change-status/${newStatus}`, null, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  // ============================================
  // AFFECTATION & UTILISATION
  // ============================================

  /**
   * Affecter un véhicule à un contrat/client (location)
   * POST /api/v1/Vehicles/assign
   */
  assignVehicle(request: AssignVehicleRequest): Observable<Response> {
    return this.http
      .post<Response>(`${this.baseUrl}/assign`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Libérer un véhicule (fin de location)
   * POST /api/v1/Vehicles/{id}/release
   */
  releaseVehicle(vehicleId: string, endMileage: number): Observable<Response> {
    const params = new HttpParams().set('endMileage', endMileage.toString());

    return this.http
      .post<Response>(`${this.baseUrl}/${vehicleId}/release`, null, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtenir l'historique d'utilisation d'un véhicule
   * GET /api/v1/Vehicles/{id}/usage-history
   */
  getVehicleUsageHistory(vehicleId: string): Observable<ApiResponseData<VehicleUsage[]>> {
    return this.http
      .get<ApiResponseData<VehicleUsage[]>>(`${this.baseUrl}/${vehicleId}/usage-history`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // ============================================
  // CONTRÔLES & ALERTES
  // ============================================

  /**
   * Vérifier si un véhicule peut être loué
   * GET /api/v1/Vehicles/{id}/can-be-rented
   */
  canBeRented(vehicleId: string): Observable<ApiResponseData<boolean>> {
    return this.http
      .get<ApiResponseData<boolean>>(`${this.baseUrl}/${vehicleId}/can-be-rented`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtenir les véhicules dont l'assurance expire bientôt
   * GET /api/v1/Vehicles/expiring-insurance
   */
  getVehiclesWithExpiringInsurance(daysThreshold: number = 30): Observable<ApiResponseData<VehicleDto[]>> {
    const params = new HttpParams().set('daysThreshold', daysThreshold.toString());

    return this.http
      .get<ApiResponseData<VehicleDto[]>>(`${this.baseUrl}/expiring-insurance`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Vérifier si l'assurance d'un véhicule est valide
   * GET /api/v1/Vehicles/{id}/insurance-valid
   */
  isInsuranceValid(vehicleId: string): Observable<ApiResponseData<boolean>> {
    return this.http
      .get<ApiResponseData<boolean>>(`${this.baseUrl}/${vehicleId}/insurance-valid`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // ============================================
  // STATISTIQUES & MÉTRIQUES
  // ============================================

  /**
   * Obtenir les statistiques du parc véhicules
   * GET /api/v1/Vehicles/statistics
   */
  getVehicleStatistics(): Observable<ApiResponseData<VehicleStatistics>> {
    return this.http
      .get<ApiResponseData<VehicleStatistics>>(`${this.baseUrl}/statistics`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtenir la distance totale parcourue par un véhicule
   * GET /api/v1/Vehicles/{id}/total-distance
   */
  getTotalDistanceTraveled(vehicleId: string): Observable<ApiResponseData<number>> {
    return this.http
      .get<ApiResponseData<number>>(`${this.baseUrl}/${vehicleId}/total-distance`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // ============================================
  // MÉTHODES UTILITAIRES
  // ============================================

  /**
   * Exporter la liste des véhicules au format CSV
   * GET /api/v1/Vehicles/export
   */
  exportVehiclesToCsv(criteria?: VehicleSearchCriteria): Observable<Blob> {
    let params = new HttpParams();

    if (criteria) {
      if (criteria.searchTerm) params = params.set('searchTerm', criteria.searchTerm);
      if (criteria.type !== undefined) params = params.set('type', criteria.type.toString());
      if (criteria.status !== undefined) params = params.set('status', criteria.status.toString());
      if (criteria.fuelType !== undefined) params = params.set('fuelType', criteria.fuelType.toString());
      if (criteria.minYear) params = params.set('minYear', criteria.minYear.toString());
      if (criteria.maxYear) params = params.set('maxYear', criteria.maxYear.toString());
      if (criteria.hasExpiredInsurance !== undefined) {
        params = params.set('hasExpiredInsurance', criteria.hasExpiredInsurance.toString());
      }
    }

    return this.http
      .get(`${this.baseUrl}/export`, {
        params,
        responseType: 'blob'
      })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Télécharger le fichier CSV exporté
   */
  downloadCsvExport(criteria?: VehicleSearchCriteria): void {
    this.exportVehiclesToCsv(criteria).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vehicles-export-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Erreur lors du téléchargement du CSV:', error);
      }
    });
  }

  // ============================================
  // GESTION DES ERREURS
  // ============================================

  /**
   * Gestionnaire d'erreurs centralisé
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.status) {
        switch (error.status) {
          case 400:
            errorMessage = 'Requête invalide';
            break;
          case 401:
            errorMessage = 'Non autorisé - Veuillez vous reconnecter';
            break;
          case 403:
            errorMessage = 'Accès refusé - Permissions insuffisantes';
            break;
          case 404:
            errorMessage = 'Ressource introuvable';
            break;
          case 500:
            errorMessage = 'Erreur serveur interne';
            break;
          default:
            errorMessage = `Erreur serveur (Code: ${error.status})`;
        }
      }
    }

    console.error('Erreur VehicleService:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }

}
