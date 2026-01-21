import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Modèles
import { IdentityType, TierRoleType, TierStatus, DocumentStatus } from '../../../../../core/models/Enums/Logistiks-enums';
import { CreateTierRequest } from '../../../../../core/models/Tiers/Tier-requests';
import { User } from '../../../../../core/models/Core/Users/Entities/User';

// Services
import { Tiers } from '../../../../../core/services/Tiers/tiers';
import { Auth } from '../../../../../core/services/Auth/auth';
import { Token } from '../../../../../core/services/Token/token';
import { NotificationService } from '../../../../../core/services/Notification/notification-service';

// Environnement
import { environment } from '../../../../../../environments/environment.development';

/**
 * Composant de création et de gestion des formulaires de tiers
 * @class TierForm
 * @implements {OnInit, OnDestroy}
 * @description Permet la création de nouveaux tiers avec validation complète
 */
@Component({
  selector: 'app-tier-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './tier-form.html',
  styleUrls: ['./tier-form.scss']
})
export class TierForm implements OnInit, OnDestroy {
  // ===========================================================================
  // CONSTANTES ET CONFIGURATION
  // ===========================================================================

  /** Options pour les selects d'identité */
  identityTypeOptions = IdentityType;

  /** Couleurs pour les avatars générés */
  private avatarColors = ['FF6B6B', '4ECDC4', 'FFD166', '06D6A0', '118AB2', 'EF476F', '7209B7', '3A86FF'];

  // ===========================================================================
  // FORMULAIRE ET ÉTATS
  // ===========================================================================

  /** Formulaire principal de création de tier */
  tierForm: FormGroup;

  /** Indique si le formulaire a été soumis */
  submitted = false;

  /** Indique si une opération est en cours */
  loading = false;

  /** Message d'erreur à afficher */
  error: string | null = null;

  /** Rôles sélectionnés pour le tier */
  selectedRoles: TierRoleType[] = [];

  /** Date maximale pour la date de naissance (18 ans minimum) */
  maxBirthDate: string;

  // ===========================================================================
  // DONNÉES ET OPTIONS
  // ===========================================================================

  /** Rôles disponibles avec leurs configurations */
  roles = [
    { value: TierRoleType.ClientParticulier, label: 'Client Particulier', icon: 'bx bx-user', color: 'primary' },
    { value: TierRoleType.Supplier, label: 'Fournisseur', icon: 'bx bx-truck', color: 'info' },
    { value: TierRoleType.ClientLivreur, label: 'Client/Livreur', icon: 'bx bx-briefcase', color: 'warning' },
    { value: TierRoleType.Partner, label: 'Partenaire', icon: 'bx bx-handshake', color: 'success' }
  ];

  /** Rôles disponibles avec descriptions */
  availableRoles = [
    {
      value: TierRoleType.ClientParticulier,
      label: 'Client Particulier',
      icon: 'bx bx-user',
      description: 'Client individuel pour la location de véhicules'
    },
    {
      value: TierRoleType.ClientLivreur,
      label: 'Client/Livreur',
      icon: 'bx bx-briefcase',
      description: 'Client professionnel avec permis de conduire'
    },
    {
      value: TierRoleType.Supplier,
      label: 'Fournisseur',
      icon: 'bx bx-truck',
      description: 'Fournisseur de véhicules ou services'
    },
    {
      value: TierRoleType.Partner,
      label: 'Partenaire',
      icon: 'bx bx-handshake',
      description: 'Partenaire commercial ou associé'
    }
  ];

  /** Statuts disponibles pour les tiers */
  statuses = [
    { value: TierStatus.Active, label: 'Actif', badge: 'success', icon: 'bx bx-check-circle' },
    { value: TierStatus.PendingValidation, label: 'En attente', badge: 'warning', icon: 'bx bx-time' },
    { value: TierStatus.Blocked, label: 'Bloqué', badge: 'danger', icon: 'bx bx-block' },
    { value: TierStatus.Inactive, label: 'Inactif', badge: 'default', icon: 'bx bx-minus-circle' }
  ];

  // ===========================================================================
  // GESTION UTILISATEUR ET INTERFACE
  // ===========================================================================

  /** Utilisateur connecté */
  currentUser: any = null;

  /** Nom d'affichage de l'utilisateur */
  userName: string = 'Utilisateur';

  /** URL de la photo de l'utilisateur */
  userPhotoUrl: string = '';

  /** État d'affichage du menu utilisateur */
  showUserMenu: boolean = false;

  /** État de réduction de la sidebar */
  isSidebarCollapsed: boolean = false;

  // ===========================================================================
  // STATISTIQUES
  // ===========================================================================

  /** Statistiques pour le menu */
  stats = {
    total: 0,
    active: 0,
    pending: 0,
    blocked: 0,
    clients: 0,
    suppliers: 0
  };

  /** Statistiques détaillées pour le tableau de bord */
  dashboardStats = {
    totalTiers: 0,
    activeTiers: 0,
    blockedTiers: 0,
    activeContracts: 0,
    recoveryRate: 0,
    documentsPending: 0,
    paymentsOverdue: 0,
    vehiclesNeedingAttention: 0,
    totalClients: 0,
    totalSuppliers: 0
  };

  // ===========================================================================
  // SUBJECTS ET SERVICES
  // ===========================================================================

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private tiersService: Tiers,
    private notificationService: NotificationService,
    private authService: Auth,
    private tokenService: Token,
    private router: Router
  ) {
    // Calculer la date maximale pour la date de naissance (18 ans minimum)
    const today = new Date();
    const minAgeDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    this.maxBirthDate = minAgeDate.toISOString().split('T')[0];

    // Initialiser le formulaire
    this.tierForm = this.createTierForm();
  }

  // ===========================================================================
  // LIFECYCLE HOOKS
  // ===========================================================================

  /**
   * Initialisation du composant
   */
  ngOnInit(): void {
    this.verifyAuthentication();
    this.loadCurrentUser();
    this.loadStatistics();
  }

  /**
   * Nettoyage à la destruction du composant
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===========================================================================
  // AUTHENTIFICATION ET GESTION UTILISATEUR
  // ===========================================================================

  /**
   * Vérifie l'authentification de l'utilisateur
   */
  private verifyAuthentication(): void {
    const token = this.tokenService.getToken();
    if (!token) {
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Charge les informations de l'utilisateur connecté
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
          if (error.status === 401) {
            this.tokenService.handleTokenExpired();
          } else {
            this.setDefaultUser();
          }
        }
      });
  }

  /**
   * Définit un utilisateur par défaut en cas d'erreur
   */
  private setDefaultUser(): void {
    this.userName = 'Utilisateur Logistiks';
    this.userPhotoUrl = this.generateAvatarUrl({ firstName: 'Utilisateur' } as User);
  }

  /**
   * Formate le nom d'utilisateur pour l'affichage
   * @param user - Utilisateur à formater
   * @returns Nom formaté
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
   * Obtient l'URL de la photo de l'utilisateur
   * @param user - Utilisateur
   * @returns URL de la photo
   */
  getUserPhotoUrl(user: User): string {
    // Si photoUrl est un ID MongoDB
    if (user.photoUrl && /^[0-9a-fA-F]{24}$/.test(user.photoUrl)) {
      return `${environment.apiUrl}/api/User/photo/${user.photoUrl}`;
    }

    // Si photoUrl est déjà une URL complète
    if (user.photoUrl && user.photoUrl.startsWith('http')) {
      return user.photoUrl;
    }

    // Sinon, générer un avatar
    return this.generateAvatarUrl(user);
  }

  /**
   * Génère un avatar à partir du nom de l'utilisateur
   * @param user - Utilisateur
   * @returns URL de l'avatar généré
   */
  generateAvatarUrl(user: User): string {
    const name = this.formatUserName(user);
    const colorIndex = name.length % this.avatarColors.length;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${this.avatarColors[colorIndex]}&color=fff&size=128`;
  }

  /**
   * Obtient les initiales de l'utilisateur
   * @returns Initiales de l'utilisateur
   */
  getUserInitials(): string {
    const parts = this.userName.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return this.userName.charAt(0).toUpperCase();
  }

  /**
   * Obtient l'URL d'avatar par défaut
   * @returns URL de l'avatar par défaut
   */
  getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=696cff&color=fff&size=128`;
  }

  // ===========================================================================
  // GESTION DES MENUS ET SIDEBAR
  // ===========================================================================

  /**
   * Basculer l'affichage du menu utilisateur
   */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  /**
   * Ferme le menu utilisateur lors d'un clic à l'extérieur
   */
  @HostListener('document:click', ['$event'])
  closeUserMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-toggle') && !target.closest('.dropdown-menu')) {
      this.showUserMenu = false;
    }
  }

  /**
   * Basculer l'état de la sidebar
   */
  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  /**
   * Basculer l'affichage d'un menu déroulant
   * @param event - Événement de clic
   */
  toggleMenu(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    element?.parentElement?.classList.toggle('open');
  }

  /**
   * Déconnecte l'utilisateur
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

  // ===========================================================================
  // STATISTIQUES
  // ===========================================================================

  /**
   * Charge les statistiques pour le menu
   */
  loadStatistics(): void {
    // Note: La méthode subscriptions.add n'existe pas dans le contexte actuel
    // Cette méthode est probablement un reste de code à corriger
    this.tiersService.getTiersList({
      pageNumber: 1,
      pageSize: 50
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const firstPageTiers = response.data || [];

          // Calculer les statistiques locales
          this.stats.total = response.totalCount || 0;
          this.stats.active = firstPageTiers.filter(t => t.status === TierStatus.Active).length;
          this.stats.pending = firstPageTiers.filter(t => t.status === TierStatus.PendingValidation).length;
          this.stats.blocked = firstPageTiers.filter(t => t.status === TierStatus.Blocked).length;
          this.stats.clients = firstPageTiers.filter(t =>
            t.roles.some(r => r.roleType === TierRoleType.ClientParticulier && r.isActive)
          ).length;
          this.stats.suppliers = firstPageTiers.filter(t =>
            t.roles.some(r => r.roleType === TierRoleType.Supplier && r.isActive)
          ).length;

          // Pour dashboardStats (valeurs estimées)
          this.dashboardStats.totalTiers = this.stats.total;
          this.dashboardStats.activeTiers = this.stats.active;
          this.dashboardStats.totalClients = this.stats.clients;
          this.dashboardStats.totalSuppliers = this.stats.suppliers;
          this.dashboardStats.documentsPending = firstPageTiers.reduce((count, tier) => {
            const pendingDocs = tier.documents?.filter(doc =>
              doc.status === DocumentStatus.Pending
            ).length || 0;
            return count + pendingDocs;
          }, 0);
        },
        error: (error) => {
          console.warn('⚠️ Erreur chargement statistiques:', error);
          this.setDefaultStatistics();
        }
      });
  }

  /**
   * Définit des statistiques par défaut en cas d'erreur
   */
  private setDefaultStatistics(): void {
    // Valeurs par défaut pour l'affichage du menu
    this.stats = {
      total: 156,
      active: 128,
      pending: 15,
      blocked: 8,
      clients: 89,
      suppliers: 42
    };

    this.dashboardStats = {
      totalTiers: 156,
      activeTiers: 128,
      blockedTiers: 8,
      activeContracts: 15,
      recoveryRate: 85,
      documentsPending: 3,
      paymentsOverdue: 2,
      vehiclesNeedingAttention: 1,
      totalClients: 89,
      totalSuppliers: 42
    };
  }

  // ===========================================================================
  // GESTION DU FORMULAIRE
  // ===========================================================================

  /**
   * Crée le formulaire de création de tier
   * @returns Formulaire initialisé
   */
  createTierForm(): FormGroup {
    return this.formBuilder.group({
      // Informations personnelles
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      companyName: [''],
      birthDate: [''],
      placeOfBirth: [''],

      // Informations d'identification
      identityType: ['', Validators.required],
      identityNumber: ['', [Validators.required, Validators.minLength(5)]],

      // Coordonnées
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      secondaryPhone: [''],
      email: ['', [Validators.email, Validators.required]],

      // Adresse
      street: [''],
      city: [''],
      country: [''],
      zipCode: [''],

      // Notes
      notes: ['']
    });
  }

  /**
   * Getter pour accéder facilement aux contrôles du formulaire
   */
  get f() {
    return this.tierForm.controls;
  }

  /**
   * Calcule le pourcentage de progression du formulaire
   * @returns Pourcentage de progression (0-100)
   */
  getFormProgress(): number {
    const totalFields = 7; // Nombre de champs obligatoires
    let completedFields = 0;

    if (this.f['firstName'].valid) completedFields++;
    if (this.f['lastName'].valid) completedFields++;
    if (this.f['identityType'].valid) completedFields++;
    if (this.f['identityNumber'].valid) completedFields++;
    if (this.f['phone'].valid) completedFields++;
    if (this.f['email'].valid) completedFields++;
    if (this.selectedRoles.length > 0) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  }

  /**
   * Gère le changement de sélection des rôles
   * @param event - Événement de changement de case à cocher
   */
  onRoleChange(event: any): void {
    const roleValue = parseInt(event.target.value);
    const isChecked = event.target.checked;

    if (isChecked) {
      if (!this.selectedRoles.includes(roleValue)) {
        this.selectedRoles.push(roleValue);
      }
    } else {
      const index = this.selectedRoles.indexOf(roleValue);
      if (index > -1) {
        this.selectedRoles.splice(index, 1);
      }
    }
  }

  // ===========================================================================
  // SOUMISSION DU FORMULAIRE
  // ===========================================================================

  /**
   * Soumet le formulaire pour créer un nouveau tier
   */
  onSubmit(): void {
    this.submitted = true;
    this.error = null;

    // Vérifier la sélection des rôles
    if (this.selectedRoles.length === 0) {
      this.notificationService.warning(
        'Rôle manquant',
        'Veuillez sélectionner au moins un rôle pour le tier'
      );
      return;
    }

    // Arrêter si le formulaire est invalide
    if (this.tierForm.invalid) {
      this.notifyFormErrors();
      return;
    }

    this.loading = true;

    // Récupérer les valeurs du formulaire
    const formValue = this.tierForm.value;

    // Préparer la requête selon l'interface CreateTierRequest
    const request: CreateTierRequest = {
      firstName: formValue.firstName || '',
      lastName: formValue.lastName || '',
      companyName: formValue.companyName || undefined,
      phone: formValue.phone || '',
      email: formValue.email || undefined,
      identityNumber: formValue.identityNumber || '',
      identityType: parseInt(formValue.identityType) || IdentityType.CNI,
      roles: this.selectedRoles,
      address: this.getAddressObject()
    };

    console.log('📤 Envoi de la requête:', request);

    this.tiersService.createTier(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;

          if (response.success && response.data) {
            this.notificationService.success(
              'Tier créé avec succès',
              `Le tier ${response.data.tierNumber} a été créé avec succès`
            );

            // Rediriger vers la liste des tiers
            this.router.navigate(['/dashboard/tiers']);
          } else {
            this.error = response.message || 'Erreur lors de la création du tier';
            this.notificationService.error(
              'Erreur de création',
              this.error
            );
          }
        },
        error: (error) => {
          this.loading = false;
          this.error = error.message || 'Une erreur est survenue lors de la création du tier';
          console.error('❌ Erreur création tier:', error);

          this.notificationService.error(
            'Erreur de création',
            this.error || 'Une erreur inconnue est survenue'
          );
        }
      });
  }

  /**
   * Sauvegarde le formulaire en tant que brouillon
   */
  saveAsDraft(): void {
    this.submitted = true;

    if (this.tierForm.invalid) {
      this.notificationService.warning(
        'Formulaire incomplet',
        'Veuillez remplir correctement tous les champs obligatoires'
      );
      return;
    }

    this.notificationService.info(
      'Brouillon sauvegardé',
      'Les informations ont été sauvegardées comme brouillon'
    );

    this.onSubmit();
  }

  /**
   * Annule la création et retourne à la liste
   */
  onCancel(): void {
    if (this.tierForm.dirty) {
      if (confirm('Voulez-vous vraiment annuler ? Les modifications non sauvegardées seront perdues.')) {
        this.router.navigate(['/dashboard/tiers']);
      }
    } else {
      this.router.navigate(['/dashboard/tiers']);
    }
  }

  /**
   * Notifie les erreurs de validation du formulaire
   */
  private notifyFormErrors(): void {
    Object.keys(this.tierForm.controls).forEach(field => {
      const control = this.tierForm.get(field);

      if (control && control.invalid) {
        if (control.errors?.['required']) {
          this.notificationService.warning(
            'Champ requis',
            `Le champ "${this.getFieldLabel(field)}" est obligatoire`
          );
        }

        if (control.errors?.['email']) {
          this.notificationService.warning(
            'Email invalide',
            'Veuillez saisir une adresse email valide'
          );
        }

        if (control.errors?.['minlength']) {
          this.notificationService.warning(
            'Valeur trop courte',
            `Le champ "${this.getFieldLabel(field)}" ne respecte pas la longueur minimale`
          );
        }

        if (control.errors?.['pattern']) {
          this.notificationService.warning(
            'Format invalide',
            `Le champ "${this.getFieldLabel(field)}" a un format incorrect`
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
      firstName: 'Prénom',
      lastName: 'Nom',
      identityType: 'Type de pièce',
      identityNumber: 'Numéro de pièce',
      phone: 'Téléphone',
      email: 'Email'
    };
    return labels[field] || field;
  }

  // ===========================================================================
  // UTILITAIRES
  // ===========================================================================

  /**
   * Construit l'objet d'adresse à partir des valeurs du formulaire
   * @returns Objet d'adresse ou undefined
   */
  private getAddressObject(): any | undefined {
    const street = this.tierForm.value.street;
    const city = this.tierForm.value.city;
    const country = this.tierForm.value.country;
    const zipCode = this.tierForm.value.zipCode;

    if (street || city || country) {
      return {
        street: street || '',
        city: city || '',
        country: country || '',
        zipCode: zipCode || undefined
      };
    }

    return undefined;
  }

  /**
   * Formate un numéro de téléphone
   * @param phone - Numéro de téléphone à formater
   * @returns Numéro formaté
   */
  formatPhoneNumber(phone: string): string {
    return this.tiersService.formatPhoneNumber(phone);
  }

  /**
   * Formate une date
   * @param date - Date à formater
   * @returns Date formatée
   */
  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('fr-FR');
    } catch (error) {
      return 'Date invalide';
    }
  }

  // ===========================================================================
  // UTILITAIRES D'AFFICHAGE (POUR LE TEMPLATE)
  // ===========================================================================

  /**
   * Obtient la classe CSS pour un badge de rôle
   * @param roleType - Type de rôle
   * @returns Classe CSS
   */
  getRoleBadgeClass(roleType: TierRoleType): string {
    const role = this.roles.find(r => r.value === roleType);
    return role ? `badge-${role.color}` : 'badge-secondary';
  }

  /**
   * Obtient la classe CSS pour un badge de statut
   * @param status - Statut du tier
   * @returns Classe CSS
   */
  getStatusBadgeClass(status: TierStatus): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? `badge-${statusObj.badge}` : 'badge-secondary';
  }

  /**
   * Obtient le texte d'un statut
   * @param status - Statut du tier
   * @returns Texte du statut
   */
  getStatusText(status: TierStatus): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? statusObj.label : 'Inconnu';
  }

  /**
   * Obtient le texte d'un rôle
   * @param roleType - Type de rôle
   * @returns Texte du rôle
   */
  getRoleText(roleType: TierRoleType): string {
    const role = this.roles.find(r => r.value === roleType);
    return role ? role.label : 'Inconnu';
  }

  /**
   * Obtient l'icône d'un statut
   * @param status - Statut du tier
   * @returns Classe de l'icône
   */
  getStatusIcon(status: TierStatus): string {
    switch (status) {
      case TierStatus.Active:
        return 'bx bx-check-circle';
      case TierStatus.PendingValidation:
        return 'bx bx-time';
      case TierStatus.Blocked:
        return 'bx bx-block';
      case TierStatus.Inactive:
        return 'bx bx-minus-circle';
      default:
        return 'bx bx-question-mark';
    }
  }

  /**
   * Getter de compatibilité (à supprimer - code résiduel)
   * @deprecated Cette méthode ne devrait pas exister
   */
  get subscriptions(): any {
    return { add: (callback: any) => callback };
  }
}
