import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../../environments/environment.development';
import { User } from '../../../../../core/models/Core/Users/Entities/User';
import { VehicleType, FuelType } from '../../../../../core/models/Enums/Logistiks-enums';
import { CreateVehicleRequest } from '../../../../../core/models/Vehicles/Vehicle.dtos';
import { Auth } from '../../../../../core/services/Auth/auth';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';
import { Token } from '../../../../../core/services/Token/token';
import { Vehicles } from '../../../../../core/services/Vehicles/vehicles';

/**
 * Composant pour la création et la gestion de formulaires de véhicules
 * @selector app-vehicule-form
 * @templateUrl ./vehicule-form.html
 * @styleUrls ./vehicule-form.scss
 */
@Component({
  selector: 'app-vehicule-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './vehicule-form.html',
  styleUrls: ['./vehicule-form.scss'],
})
export class VehiculeForm implements OnInit, OnDestroy {
  // ============================================================================
  // SECTION 1: PROPRIÉTÉS DE GESTION DU FORMULAIRE
  // ============================================================================

  /** Formulaire principal pour la création de véhicule */
  vehicleForm: FormGroup;

  /** Indique si le formulaire a été soumis */
  submitted = false;

  /** Indique si une opération est en cours (chargement) */
  loading = false;

  /** Message d'erreur global */
  error: string | null = null;

  /** Indique si le numéro de plaque existe déjà */
  plateNumberExists = false;

  // ============================================================================
  // SECTION 2: PROPRIÉTÉS DE DONNÉES ET D'ÉTAT
  // ============================================================================

  /** Statistiques du tableau de bord (pour affichage) */
  dashboardStats = {
    totalTiers: 0,
    activeTiers: 0,
    activeContracts: 0,
    recoveryRate: 0,
    documentsPending: 0,
    paymentsOverdue: 0,
    vehiclesNeedingAttention: 0,
    totalClients: 0,
    totalSuppliers: 0
  };

  /** Année courante pour validation des champs date */
  currentYear = new Date().getFullYear();

  /** Date courante au format ISO (YYYY-MM-DD) */
  currentDate = new Date().toISOString().split('T')[0];

  // ============================================================================
  // SECTION 3: PROPRIÉTÉS DE GESTION UTILISATEUR
  // ============================================================================

  /** Utilisateur actuellement connecté */
  currentUser: any = null;

  /** Nom d'affichage de l'utilisateur */
  userName: string = 'Utilisateur';

  /** URL de la photo de profil de l'utilisateur */
  userPhotoUrl: string = '';

  /** Contrôle l'affichage du menu utilisateur */
  showUserMenu: boolean = false;

  // ============================================================================
  // SECTION 4: PROPRIÉTÉS D'INTERFACE UTILISATEUR
  // ============================================================================

  /** État de réduction de la barre latérale */
  isSidebarCollapsed: boolean = false;

  // ============================================================================
  // SECTION 5: ÉNUMÉRATIONS ET SERVICES
  // ============================================================================

  /** Types de véhicules disponibles */
  vehicleType = VehicleType;

  /** Types de carburant disponibles */
  fuelType = FuelType;

  /** Subject pour la gestion de la destruction des observables */
  private destroy$ = new Subject<void>();

  // ============================================================================
  // SECTION 6: CONSTRUCTEUR ET INJECTION DE DÉPENDANCES
  // ============================================================================

  /**
   * Constructeur du composant
   * @param formBuilder - Service de création de formulaires réactifs
   * @param vehiclesService - Service de gestion des véhicules
   * @param notificationService - Service de notifications
   * @param authService - Service d'authentification
   * @param tokenService - Service de gestion des tokens
   * @param router - Service de routage
   */
  constructor(
    private formBuilder: FormBuilder,
    private vehiclesService: Vehicles,
    private notificationService: NotificationService,
    private authService: Auth,
    private tokenService: Token,
    private router: Router
  ) {
    this.vehicleForm = this.createVehicleForm();
  }

  // ============================================================================
  // SECTION 7: LIFECYCLE HOOKS
  // ============================================================================

  /**
   * Initialise le composant
   * Vérifie l'authentification et charge les données utilisateur
   */
  ngOnInit(): void {
    this.checkAuthentication();
    this.loadCurrentUser();
  }

  /**
   * Nettoie les ressources à la destruction du composant
   * Désabonne tous les observables
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // SECTION 8: GESTION D'AUTHENTIFICATION ET UTILISATEUR
  // ============================================================================

  /**
   * Vérifie la présence d'un token d'authentification
   * Redirige vers la page de login si absent
   */
  private checkAuthentication(): void {
    const token = this.tokenService.getToken();
    if (!token) {
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Charge les informations de l'utilisateur courant
   */
  loadCurrentUser(): void {
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: User) => {
          this.currentUser = user;
          this.userName = this.formatUserName(user);
          this.userPhotoUrl = this.getUserPhotoUrl(user);
        },
        error: (error) => {
          console.error('Erreur chargement utilisateur:', error);
          this.handleUserLoadError(error);
        }
      });
  }

  /**
   * Gère les erreurs de chargement de l'utilisateur
   * @param error - Erreur survenue
   */
  private handleUserLoadError(error: any): void {
    if (error.status === 401) {
      this.tokenService.handleTokenExpired();
    } else {
      this.setDefaultUser();
    }
  }

  /**
   * Définit les valeurs par défaut pour l'utilisateur
   */
  private setDefaultUser(): void {
    this.userName = 'Utilisateur Logistiks';
    this.userPhotoUrl = this.generateAvatarUrl({ firstName: 'Utilisateur' } as User);
  }

  /**
   * Formate le nom d'utilisateur pour l'affichage
   * @param user - Objet utilisateur
   * @returns Nom formaté pour l'affichage
   */
  formatUserName(user: any): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
      return user.firstName;
    } else if (user.username) {
      return user.username;
    } else if (user.email) {
      return user.email.split('@')[0];
    }
    return 'Utilisateur Logistiks';
  }

  /**
   * Obtient l'URL de la photo de profil de l'utilisateur
   * @param user - Objet utilisateur
   * @returns URL de la photo de profil
   */
  getUserPhotoUrl(user: User): string {
    if (user.photoUrl && /^[0-9a-fA-F]{24}$/.test(user.photoUrl)) {
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    }

    if (user.photoUrl && user.photoUrl.startsWith('http')) {
      return user.photoUrl;
    }

    return this.generateAvatarUrl(user);
  }

  /**
   * Génère une URL d'avatar à partir du nom de l'utilisateur
   * @param user - Objet utilisateur
   * @returns URL de l'avatar généré
   */
  generateAvatarUrl(user: User): string {
    const name = this.formatUserName(user);
    const colors = ['FF6B6B', '4ECDC4', 'FFD166', '06D6A0', '118AB2', 'EF476F', '7209B7', '3A86FF'];
    const colorIndex = name.length % colors.length;

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[colorIndex]}&color=fff&size=128`;
  }

  /**
   * Obtient les initiales de l'utilisateur
   * @returns Initiales de l'utilisateur
   */
  getUserInitials(): string {
    const name = this.userName;
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }

  /**
   * Obtient l'avatar par défaut
   * @returns URL de l'avatar par défaut
   */
  getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=696cff&color=fff&size=128`;
  }

  // ============================================================================
  // SECTION 9: GESTION DU FORMULAIRE VÉHICULE
  // ============================================================================

  /**
   * Crée le formulaire réactif pour la création de véhicule
   * @returns FormGroup configuré
   */
  createVehicleForm(): FormGroup {
    return this.formBuilder.group({
      // === INFORMATIONS GÉNÉRALES ===
      type: ['', Validators.required],
      brand: ['', [Validators.required, Validators.minLength(2)]],
      model: ['', [Validators.required, Validators.minLength(2)]],
      year: ['', [Validators.required, Validators.min(this.currentYear - 30), Validators.max(this.currentYear + 1)]],
      color: [''],
      fuelType: ['', Validators.required],

      // === IDENTIFICATION ===
      plateNumber: ['', [Validators.required, Validators.minLength(5)]],
      chassisNumber: [''],
      engineNumber: [''],
      currentMileage: ['', [Validators.required, Validators.min(0)]],

      // === ACQUISITION ===
      acquisitionDate: ['', Validators.required],
      acquisitionCost: ['', [Validators.required, Validators.min(0)]],
      purchasePrice: ['', [Validators.required, Validators.min(0)]],

      // === ASSURANCE ===
      insuranceCompany: ['', Validators.required],
      insurancePolicyNumber: ['', Validators.required],
      insuranceStartDate: ['', Validators.required],
      insuranceEndDate: ['', [Validators.required]],
      insuranceCoverageType: ['', Validators.required],
      insuranceAnnualPremium: ['', [Validators.required, Validators.min(0)]],

      // === CARACTÉRISTIQUES ===
      engineCapacity: [''],
      fuelCapacity: [''],
      transmission: [''],
      hasGps: [false],
      hasAirConditioning: [false],
      additionalFeatures: [''],

      // === LOCALISATION & NOTES ===
      currentLocationAddress: [''],
      notes: ['']
    });
  }

  /**
   * Getter pour accéder facilement aux contrôles du formulaire
   * @returns Contrôles du formulaire
   */
  get f() {
    return this.vehicleForm.controls;
  }

  /**
   * Obtient la valeur du champ de date de début d'assurance
   * @returns Valeur du champ ou chaîne vide
   */
  get insuranceStartDateValue(): string {
    return this.vehicleForm.get('insuranceStartDate')?.value || '';
  }

  /**
   * Calcule la progression de remplissage du formulaire
   * @returns Pourcentage de progression (0-100)
   */
  getFormProgress(): number {
    const totalFields = 15; // Nombre de champs obligatoires
    let completedFields = 0;

    const requiredFields = [
      'type', 'brand', 'model', 'year', 'fuelType',
      'plateNumber', 'currentMileage',
      'acquisitionDate', 'acquisitionCost', 'purchasePrice',
      'insuranceCompany', 'insurancePolicyNumber', 'insuranceStartDate',
      'insuranceEndDate', 'insuranceCoverageType', 'insuranceAnnualPremium'
    ];

    requiredFields.forEach(field => {
      const control = this.vehicleForm.get(field);
      if (control && control.valid) {
        completedFields++;
      }
    });

    return Math.round((completedFields / totalFields) * 100);
  }

  /**
   * Vérifie la disponibilité du numéro de plaque
   * Effectue une requête API pour vérifier si la plaque existe déjà
   */
  checkPlateNumberAvailability(): void {
    const plateNumber = this.vehicleForm.get('plateNumber')?.value;
    if (plateNumber && plateNumber.length >= 5) {
      this.loading = true;
      this.vehiclesService.getVehicleByPlateNumber(plateNumber)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.loading = false;
            this.plateNumberExists = response.success && response.data !== null;

            if (this.plateNumberExists) {
              this.notificationService.warning(
                'Plaque déjà existante',
                `La plaque ${plateNumber} est déjà attribuée à un véhicule`
              );
            }
          },
          error: () => {
            this.loading = false;
            this.plateNumberExists = false;
          }
        });
    }
  }

  // ============================================================================
  // SECTION 10: SOUMISSION ET VALIDATION DU FORMULAIRE
  // ============================================================================

  /**
   * Gère la soumission du formulaire
   * Valide les données et envoie la requête de création
   */
  onSubmit(): void {
    this.submitted = true;
    this.error = null;

    // Vérifier la disponibilité de la plaque
    if (this.plateNumberExists) {
      this.notificationService.error(
        'Plaque existante',
        'Veuillez choisir une autre plaque d\'immatriculation'
      );
      return;
    }

    // Arrêter si le formulaire est invalide
    if (this.vehicleForm.invalid) {
      this.notifyFormErrors();
      return;
    }

    this.loading = true;

    const formValue = this.vehicleForm.value;
    const request = this.prepareCreateRequest(formValue);

    console.log('📤 Envoi de la requête véhicule:', request);

    this.vehiclesService.createVehicle(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => this.handleCreateSuccess(response),
        error: (error) => this.handleCreateError(error)
      });
  }

  /**
   * Prépare l'objet de requête pour la création du véhicule
   * @param formValue - Valeurs du formulaire
   * @returns Objet CreateVehicleRequest formaté
   */
  private prepareCreateRequest(formValue: any): CreateVehicleRequest {
    return {
      type: parseInt(formValue.type),
      brand: formValue.brand,
      model: formValue.model,
      year: parseInt(formValue.year),
      plateNumber: formValue.plateNumber,
      chassisNumber: formValue.chassisNumber || undefined,
      engineNumber: formValue.engineNumber || undefined,
      color: formValue.color || undefined,
      fuelType: parseInt(formValue.fuelType),
      currentMileage: parseFloat(formValue.currentMileage),
      acquisitionDate: formValue.acquisitionDate,
      acquisitionCost: parseFloat(formValue.acquisitionCost),
      purchasePrice: parseFloat(formValue.purchasePrice),
      insurance: {
        company: formValue.insuranceCompany,
        policyNumber: formValue.insurancePolicyNumber,
        startDate: formValue.insuranceStartDate,
        endDate: formValue.insuranceEndDate,
        coverageType: formValue.insuranceCoverageType,
        annualPremium: parseFloat(formValue.insuranceAnnualPremium)
      },
      features: {
        engineCapacity: formValue.engineCapacity ? parseInt(formValue.engineCapacity) : undefined,
        fuelCapacity: formValue.fuelCapacity ? parseInt(formValue.fuelCapacity) : undefined,
        transmission: formValue.transmission || undefined,
        hasGps: formValue.hasGps,
        hasAirConditioning: formValue.hasAirConditioning,
        additionalFeatures: formValue.additionalFeatures
          ? formValue.additionalFeatures.split(',').map((f: string) => f.trim()).filter((f: string) => f)
          : []
      },
      currentLocation: formValue.currentLocationAddress ? {
        address: formValue.currentLocationAddress,
        latitude: 0,
        longitude: 0
      } : undefined,
      notes: formValue.notes || undefined
    };
  }

  /**
   * Gère le succès de la création du véhicule
   * @param response - Réponse de l'API
   */
  private handleCreateSuccess(response: any): void {
    this.loading = false;

    if (response.success && response.data) {
      this.notificationService.success(
        'Véhicule créé avec succès',
        `Le véhicule ${response.data.plateNumber} a été ajouté au parc`
      );

      this.router.navigate(['/dashboard/vehicules']);
    } else {
      this.error = response.message || 'Erreur lors de la création du véhicule';
      this.notificationService.error(
        'Erreur de création',
        this.error || 'Erreur lors de la création du véhicule'
      );
    }
  }

  /**
   * Gère les erreurs de création du véhicule
   * @param error - Erreur survenue
   */
  private handleCreateError(error: any): void {
    this.loading = false;

    // CAS 1 — Erreur métier API standardisée
    if (error.error?.message) {
      this.notificationService.error(
        'Erreur de validation',
        error.error.message
      );

      // Erreurs métier détaillées (codes)
      if (Array.isArray(error.error.errors)) {
        error.error.errors.forEach((errCode: string) => {
          this.notificationService.warning(
            'Détail',
            this.mapBackendError(errCode)
          );
        });
      }

      return;
    }

    // CAS 2 — Erreur HTTP générique
    if (error.status) {
      this.notificationService.error(
        'Erreur serveur',
        `Erreur ${error.status} – veuillez réessayer`
      );
      return;
    }

    // CAS 3 — Erreur inconnue
    this.notificationService.error(
      'Erreur inconnue',
      'Une erreur inattendue est survenue'
    );
  }

  /**
   * Notifie les erreurs de validation du formulaire
   * Affiche des notifications pour chaque champ invalide
   */
  private notifyFormErrors(): void {
    Object.keys(this.vehicleForm.controls).forEach(field => {
      const control = this.vehicleForm.get(field);

      if (control && control.invalid) {
        if (control.errors?.['required']) {
          this.notificationService.warning(
            'Champ requis',
            `Le champ "${this.getFieldLabel(field)}" est obligatoire`
          );
        }

        if (control.errors?.['min']) {
          this.notificationService.warning(
            'Valeur minimale',
            `Le champ "${this.getFieldLabel(field)}" ne respecte pas la valeur minimale`
          );
        }

        if (control.errors?.['max']) {
          this.notificationService.warning(
            'Valeur maximale',
            `Le champ "${this.getFieldLabel(field)}" dépasse la valeur maximale`
          );
        }
      }
    });
  }

  /**
   * Obtient le libellé d'un champ pour l'affichage
   * @param field - Nom du champ
   * @returns Libellé du champ
   */
  private getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      type: 'Type de véhicule',
      brand: 'Marque',
      model: 'Modèle',
      year: 'Année',
      fuelType: 'Type de carburant',
      plateNumber: 'Plaque d\'immatriculation',
      currentMileage: 'Kilométrage actuel',
      acquisitionDate: 'Date d\'acquisition',
      acquisitionCost: 'Coût d\'acquisition',
      purchasePrice: 'Prix d\'achat',
      insuranceCompany: 'Compagnie d\'assurance',
      insurancePolicyNumber: 'Numéro de police',
      insuranceStartDate: 'Date de début d\'assurance',
      insuranceEndDate: 'Date d\'expiration d\'assurance',
      insuranceCoverageType: 'Type de couverture',
      insuranceAnnualPremium: 'Prime annuelle'
    };
    return labels[field] || field;
  }

  /**
   * Map les codes d'erreur backend vers des messages utilisateur
   * @param code - Code d'erreur backend
   * @returns Message d'erreur lisible
   */
  private mapBackendError(code: string): string {
    const map: Record<string, string> = {
      INVALID_INSURANCE: 'L\'assurance est expirée ou invalide',
      DUPLICATE_PLATE: 'Cette plaque est déjà enregistrée',
      INVALID_ACQUISITION_DATE: 'La date de mise en service est invalide',
      INVALID_MILEAGE: 'Le kilométrage est incohérent'
    };

    return map[code] || 'Erreur de validation inconnue';
  }

  /**
   * Sauvegarde le formulaire en tant que brouillon
   */
  saveAsDraft(): void {
    this.submitted = true;

    if (this.vehicleForm.invalid) {
      this.notificationService.warning(
        'Formulaire incomplet',
        'Veuillez remplir correctement tous les champs obligatoires'
      );
      return;
    }

    // Pour un brouillon, on peut sauvegarder localement ou envoyer avec un statut différent
    this.notificationService.info(
      'Brouillon sauvegardé',
      'Les informations ont été sauvegardées comme brouillon'
    );

    // Appeler onSubmit mais avec un flag de brouillon
    this.onSubmit();
  }

  /**
   * Annule la création et retourne à la liste des véhicules
   * Demande confirmation si des modifications non sauvegardées existent
   */
  onCancel(): void {
    if (this.vehicleForm.dirty) {
      if (confirm('Voulez-vous vraiment annuler ? Les modifications non sauvegardées seront perdues.')) {
        this.router.navigate(['/dashboard/vehicules']);
      }
    } else {
      this.router.navigate(['/dashboard/vehicules']);
    }
  }

  // ============================================================================
  // SECTION 11: GESTION DE L'INTERFACE UTILISATEUR
  // ============================================================================

  /**
   * Bascule l'affichage du menu utilisateur
   */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  /**
   * Écouteur d'événement pour fermer le menu utilisateur
   * @param event - Événement de clic
   */
  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-toggle') && !target.closest('.dropdown-menu')) {
      this.showUserMenu = false;
    }
  }

  /**
   * Bascule l'état de réduction de la barre latérale
   */
  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  /**
   * Bascule l'état d'ouverture d'un menu
   * @param event - Événement de clic
   */
  toggleMenu(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    if (element && element.parentElement) {
      element.parentElement.classList.toggle('open');
    }
  }

  // ============================================================================
  // SECTION 12: GESTION DE LA DÉCONNEXION
  // ============================================================================

  /**
   * Gère le processus de déconnexion
   * Nettoie le token et redirige vers la page de login
   */
  logout(): void {
    console.log('🚪 Déconnexion en cours...');
    this.tokenService.logout();

    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Déconnexion API réussie');
          this.router.navigate(['/auth/login']);
        },
        error: (error) => {
          console.warn('⚠️ Erreur API déconnexion (ignorée):', error);
          this.router.navigate(['/auth/login']);
        }
      });
  }
}
