# AUDIT — Projet LOGISTIK (backend .NET 8 + frontend Angular 21)

> Généré le 2026-09-16 · Document de reprise (équivalent du HANDOFF.md utilisé sur EKKLESIA).
> Sources analysées : code des deux dépôts + **Documentation Fonctionnelle & Technique LOGISTIK v2.0 (PDF, 32 pages)**.
> Sévérités : **CRITIQUE** (sécurité ou production cassée) · **MAJEUR** · **MOYEN** · **FAIBLE**.
> Les constats marqués ✅ ont été revérifiés manuellement dans le code.

---

## 0. TL;DR — à retenir

1. **Sécurité : 6 contrôleurs étaient totalement ouverts** (utilisateurs, rôles, fichiers, test e-mail, dashboard v2, signature). `[Authorize]` + policies ont été ajoutés dans cette session.
2. **Escalade de privilèges** : l'inscription publique acceptait les rôles fournis par le client → création d'un `SUPER_ADMIN` possible. Corrigé (rôle forcé à `DRIVER` sans `User_Manage`).
3. **Secrets de production commités** (`env.txt`, `appsettings*.json`) : rotation + purge d'historique **à faire par un humain** ; les fichiers ont été retirés du suivi Git.
4. **Intégration front↔back : 6 fonctionnalités réelles cassées** (upload contrat signé, rejet de document, pénalités, impayés, export tiers, stats utilisateurs) + `PaymentMethod` désaligné qui corrompait les données financières. Le plus grave (`PaymentMethod`, champ upload, env de prod) est corrigé ; les routes manquantes restent à créer.
5. **Aucun test, aucune CI, Docker non fonctionnel des deux côtés** : à traiter en vague 2.
6. **Refonte UI + mobile** : à mener écran par écran sur la base du design system du PDF (palette `#696CFF`).

---

## 1. Cartographie

### Backend (`Logistiks_Backend`, 7 projets, .NET 8 / MongoDB Atlas)
| Projet | Rôle |
|---|---|
| `Domain` | Entités, DTO internes, enums, config (`AppUrlsConfig`, `SecurityOption`) |
| `Infra.Mongo` | `ApplicationUser`/`ApplicationRole` (Identity Mongo), contexte, repository |
| `Infrastructure` | DTOs, AutoMapper, `RoleSeeder`, `ChatbotKnowledgeBaseSeeder`, scripts maintenance |
| `Services` | 18 services métier (Auth, Users, Tiers, Vehicles, Contracts, Documents, Finances, Reports, Rentability, Signature, Chatbot, Email, Storage…) |
| `WebApi` | Controllers v1/v2, ~100 policies d'autorisation, middlewares |
| `WorkerService` | **stub vide** (log toutes les secondes, aucune référence projet) |
| `Services.Tests` | **aucun test** (1 fichier `MSTestSettings.cs`) |

### Frontend (`Logistiks_Frontend`, Angular 21 standalone)
- 150 `.ts` (~30 k lignes), 38 templates, 53 specs (quasi toutes vides).
- Modules : Auth, Dashboard, Tiers, Véhicules, Contrats, Documents, Finances, Rentabilité, Rapports, Utilisateurs/Rôles, Chatbot.
- UI : Tailwind v4 + SCSS maison, Chart.js, `jwt-decode`, Vitest.

### Documentation PDF — 8 modules et règles structurantes
Tiers (1 téléphone = 1 compte, blocage après 2 retards, verrouillage après 1er contrat) · Véhicules (plaque unique, km croissant, coût d'acquisition, assurance valide) · Documents (GridFS 16 Mo, dédup MD5, photos 5 Mo) · Contrats (6 validations + automatismes signature) · Transactions (**RG-001 à RG-017**, immuabilité, workflow Pending→Verified→Paid) · Rentabilité (KPI flotte, ROI véhicule, comparaison de périodes) · Utilisateurs (6 rôles, ~85 permissions SUPER_ADMIN) · Auth/Sécurité (JWT HS256 1 j / 30 j, refresh 256 bits, reset 24 h).

---

## 2. CORRIGÉ DANS CETTE SESSION

### 2.1 Backend — sécurité
| # | Correction | Fichiers |
|---|---|---|
| B1 | `[Authorize]` rétabli sur les contrôleurs ouverts : `UserController`, `RolesController`, `FilesController`, `DashboardController` v2 (policy `CAN_VIEW_DASHBOARD`), `SignatureController`, `EmailTestController` (policy `CAN_ADMIN_SYSTEM`) | `Controllers/v1/Core/UsersController.cs`, `RolesController.cs`, `Storage/FilesController.cs`, `v2/Dashboard/DashboardController.cs`, `v1/Signature/SignatureController.cs`, `v1/Email/EmailTestController.cs` ✅ |
| B2 | Policies fines ajoutées : `CAN_MANAGE_USERS` (liste, statut, export, editable-fields), `CAN_MANAGE_ROLES` (CRUD rôles), `CAN_DELETE_DOCUMENT` (suppression fichier) | idem + `Configurations/Authorization/AuthorizationPolicies.cs` ✅ |
| B3 | **Inscription** : rôles imposés (`DRIVER`) si l'appelant n'est pas authentifié avec `User_Manage` (sinon escalade SUPER_ADMIN) | `UsersController.Register` ✅ |
| B4 | `PasswordHash` jamais sérialisé (`[JsonIgnore]`) — il fuitait via `GET /api/Auth/me` | `Domain/Models/Core/Users/User.cs` ✅ |
| B5 | **Reset password** : `RedirectPath` client ignoré (sauf chemin relatif) → plus d'exfiltration du token par phishing | `Services/Auth/AuthService.ForgotPasswordAsync` ✅ |
| B6 | **Signature** : le mot de passe du signataire n'est plus stocké en clair, seule une empreinte SHA-256 est conservée | `Services/Documents/DocumentService.cs` ✅ |
| B7 | **Rate limiting** : policy `auth` 10 req/min/IP (Auth + inscription), policy `public` 30 req/min/IP (chatbot) + `UseForwardedHeaders` (IP réelle derrière Render) | `WebApi/Program.cs`, `AuthController`, `UsersController`, `ChatbotController` ✅ |
| B8 | **Logout révoque le refresh token** ; refresh : comparaison à temps constant, rotation, expiration cohérente | `Services/Auth/AuthService.cs`, `IAuthService.cs`, `AuthController` ✅ |
| B9 | **Durées JWT alignées sur le PDF §9.2** : 1 jour (standard) / 30 jours (Remember Me), partagées par le refresh ; `RememberMe` persisté | `Services/Token/TokenService.cs`, `Infra.Mongo/ApplicationUser.cs` ✅ |
| B10 | Bugs auth corrigés : `ChangePassword` renvoyait toujours `false` ; `ResetPassword` renvoyait « Votre Session a expiré » en cas de succès ; `Forbid("msg")` → vrai 403 | `AuthService.cs`, `UsersController.cs` ✅ |
| B11 | Secrets retirés du suivi Git : `env.txt` et `appsettings.Development.json` (`git rm --cached` + `.gitignore`) | racine ✅ |

### 2.2 Frontend — intégration et sécurité
| # | Correction | Fichiers |
|---|---|---|
| F1 | **14 imports actifs de `environment.development`** remplacés par `environment` (les images/avatars pointaient vers `localhost:7134` en production) | `dashboard.ts`, `contrats-list.ts`, `tiers-list.ts`, `vehicules-list.ts`, `documents-*.ts`, `tier-form.ts`, `vehicule-form.ts`, `vehicules-insurrance.ts`, `finance-*.ts`, `about-home.ts`, `api.ts` ✅ |
| F2 | **`PaymentMethod` réaligné sur le backend** (`Cash=1, MobileMoney=2, BankTransfer=3, Check=4`) + suppression de « Carte de crédit » (valeur inexistante côté serveur) | `Financial.models.ts`, `finance-create-transaction.html`, `finance-transactions.html` ✅ |
| F3 | Upload du contrat signé : champ renommé `SignedContractFile` (attendu par le DTO backend) | `Contract/contract.ts` ✅ |
| F4 | `Roles.getAllPermissions()` : lisait `.data` d'un tableau brut → liste vide ; lit désormais le tableau | `Roles/roles.ts` ✅ |
| F5 | `Users.updateCurrentUser()` : normalise la réponse backend `{ message, user }` → plus de fausse erreur après un succès | `Users/users.ts` ✅ |
| F6 | **XSS chatbot** : échappement HTML avant les remplacements markdown (`[innerHTML]`) | `chatbot-widget.ts` ✅ |
| F7 | Log du payload JWT complet supprimé (fuite e-mail/rôles en console) | `Token/token.ts` ✅ |
| F8 | Tests : `providersFile` (Router/HttpClient/animations) → **48/53 specs passent** (contre 26/53) ; `ApiResponse` global exporté | `src/test-providers.ts`, `angular.json`, `tsconfig.spec.json`, `ApiResponse.ts`, `auth.ts` ✅ |

### 2.3 Vérifications exécutées
- `dotnet build Logistiks_Backend.slnx -c Release` → **0 erreur**.
- `npm run build` (Angular production) → **OK**.
- `npx ng test --watch=false` → 48/53 fichiers (5 specs fragiles restantes, cf. §5.4).

### 2.4 Session 2 — encodage, rentabilité, export Excel

**Encodage (incident corrigé)**
| # | Détail |
|---|---|
| E1 | Un script PowerShell (`Get-Content` PS 5.1 lit l'UTF-8 en ANSI) avait double-encodé **14 fichiers `.ts`** (« é » → « Ã© », emojis perdus). **Restauration depuis Git** de ces 14 fichiers + réapplication de la seule modification attendue (ligne d'import `environment`) → `git diff --numstat` = 1 ligne par fichier. Scan de contrôle : **0 occurrence de mojibake** dans `Logistiks_Frontend` et `Logistiks_Backend`. |
| E2 | Leçon : ne plus réécrire de fichiers UTF-8 via PowerShell ; utiliser l'outil d'édition (UTF-8) ou `python -X utf8`. |

**Rentabilité / KPI (vérifié contre le PDF §7)**
| # | Verdict |
|---|---|
| R1 | Formules **conformes** : ROI = Profit/CoûtAcquisition ×100, marge nette = Profit/Revenus ×100, taux d'utilisation véhicule = jours loués/jours période, taux flotte = véhicules Rented/total actifs, Top3/Bottom3 par ProfitNet, ventilation Maintenance/Carburant/Assurance/Taxes/Autres. |
| R2 | ❌ **RG-008/RG-009 violées** : les calculs utilisaient `VerifiedAt != null` (transactions *vérifiées*) au lieu du statut **Paid**, et le modèle `FinancialTransaction` n'avait **aucun statut**. **Corrigé** : ajout de l'enum `TransactionStatus` (Pending/Verified/Paid/Cancelled), du champ `status` + `paidAt`, création en `Pending`, vérification → `Verified`, nouvel endpoint `PUT /api/v1/Finance/transactions/{id}/pay` (`CAN_VERIFY_PAYMENT`) → `Paid` + recalcul, et filtre de comptabilisation « Paid (ou legacy vérifié) » appliqué aux revenus/dépenses → dashboard, KPI flotte, ROI et rapports sont désormais conformes. |
| R3 | Front : badge de statut (En attente/Vérifiée/Payée), bouton « Confirmer le paiement » (check-double) sur les transactions vérifiées, libellés français alignés. |

**Export Excel personnalisé des transactions (nouveau)**
| # | Détail |
|---|---|
| X1 | **Backend** : `POST /api/v1/Finance/transactions/export` (policy `CAN_EXPORT_PAYMENT`) → `FinancialService.ExportTransactionsAsync` + `BuildTransactionsWorkbook` (ClosedXML). Filtres : période, type, statuts, catégories, véhicule, montants min/max, recherche (regex échappée, anti-ReDoS), plafond 50 000 lignes. 15 colonnes au choix, en-têtes français, titre aux couleurs LOGISTIK (`#696CFF`), volets figés, filtre auto, formats `#,##0 "FCFA"`, **récapitulatif payées uniquement** (RG-008/009). |
| X2 | **Frontend** : bouton « Exporter Excel » + modale (période pré-remplie depuis les filtres de l'écran, type, statut, recherche, cases à cocher des colonnes), appel blob et téléchargement `Transactions_Logistiks_AAAA-MM-JJ.xlsx`, gestion d'erreur JSON dans le blob. |

**Vérifications session 2**
- `dotnet build -c Release` → **0 erreur** ; `npm run build` → **OK** ; `npx ng test` → **48/53** (5 specs fragiles préexistantes, cf. §5.7).

**Incident runtime corrigé — policy non enregistrée**
| # | Détail |
|---|---|
| P1 | `POST /transactions/export` levait `InvalidOperationException: The AuthorizationPolicy named: 'CanExportPayment' was not found` (500). La constante `CAN_EXPORT_PAYMENT` existait mais **n'était pas enregistrée** dans `ConfigureFinancialPolicies`. Corrigé : policy ajoutée → `Permission.Payment_Export` (seedée MANAGER + FINANCE, conforme à la matrice PDF §14). |
| P2 | Audit systématique des policies : **90 constantes déclarées, 55 enregistrées**. **34 constantes ne sont enregistrées nulle part** (ex. `CAN_APPROVE_EXPENSE`, `CAN_UPDATE_PAYMENT`, `CAN_READ_TRANSFER`, `CAN_SEND_NOTIFICATIONS`…). Aucune n'est utilisée aujourd'hui par un contrôleur (vérifié automatiquement) → pas de 500 en l'état, mais **toute future utilisation produira la même erreur**. À enregistrer au fil de l'eau ou à supprimer. |

---

## 3. RESTE À FAIRE — CRITIQUE (humain + vague 2)

| # | Action | Preuve / détail |
|---|---|---|
| C1 | **Rotation de TOUS les secrets** puis purge de l'historique Git (BFG/filter-repo) : MongoDB Atlas, clé JWT, SMTP/API Brevo. Ils restent dans l'historique et dans `appsettings.json` (`Secret`, `ConnectionString`, `Password`) | `appsettings.json:12,25,36` ✅ |
| C2 | Ajouter une **`FallbackPolicy` globale** (`RequireAuthenticatedUser`) — filet de sécurité pour tout futur contrôleur. Nécessite d'annoter `[AllowAnonymous]` les endpoints volontairement publics (login, refresh, forgot/validate/reset, chatbot welcome/message, health) | `WebApi/Configurations/Authorization/AuthorizationExtensions.cs` |
| C3 | **Tests d'autorisation HTTP** (200/401/403 par rôle) — aujourd'hui zéro test : les correctifs B1-B3 ne sont couverts par rien | projet `Services.Tests` vide |
| C4 | Vérifier que **Render** utilise bien les variables d'environnement (`JwtConfig__Secret`, `DATABASE__ConnectionString`, `EmailSettings__*`) et non `appsettings.json` avant de retirer les secrets du fichier | `appsettings.json` |

---

## 4. RESTE À FAIRE — MAJEUR

### 4.1 Fonctionnalités cassées (routes manquantes côté backend)
| Fonction | Appel front | À faire |
|---|---|---|
| Rejet de document | `POST /api/Documents/{id}/reject` (`document.ts:421`) | Créer la route (réutiliser `UpdateDocumentStatusAsync(id, Rejected, userId, reason)`) ou basculer le front sur `PUT /{id}/status` |
| Pénalités de retard | `GET /api/v1/Contracts/{id}/penalties` (`contract.ts:33`) | Exposer la logique (DTO `LatePenaltyInfo` déjà présent) |
| Impayés | `GET /api/v1/Contracts/payments/overdue` (`contract.ts:263`) | Exposer, ou brancher le front sur `GET /api/v1/reports/overdue-payments` (existe ✅) |
| Export tiers | `GET /api/v1/Tiers/export` (`tiers.ts:266`) | Implémenter sur le modèle de `VehiclesController.ExportVehiclesToCsv` |
| Statistiques utilisateurs | `GET /api/User/statistics` (`users.ts:312`) | Route inexistante (absorbée par `{id}`) — calculer ou retirer l'appel |
| Stat Tiers | `GET /api/v1/Tiers/statistics` | Existe mais renvoie des **zéros codés en dur** (`TiersController.cs:876`) |
| Comparaison de périodes | `POST /api/v1/reports/compare` | Le service `ReportService.GetPeriodComparisonAsync` existe, la route non |
| Upload signé | ✅ corrigé côté front | — |

### 4.2 Fiabilité métier (règles du PDF)
| # | Règle / risque | Détail |
|---|---|---|
| M1 | **Aucune transaction MongoDB** : activation de contrat (contrat + dépôt + paiement + véhicule + compteurs), paiements, réservations → états incohérents possibles | `ContractService.cs:999-1125`, `:1405-1489`, `VehicleService.cs:1291-1313` |
| M2 | **Paiements non validés** : montant négatif accepté → solde client augmenté (`Inc(Balance, -AmountPaid)`) | `RecordPaymentRequest.cs:16`, `ContractService.cs:1471` |
| M3 | Numéro de contrat par `CountDocuments + 1` → collision sous concurrence | `ContractService.cs:2807` |
| M4 | RG-013/014 (immuabilité) **respectées au niveau API** (aucun PUT/DELETE transaction) — à verrouiller par un index/audit ; RG-007/008/009 (calculs sur `Paid` uniquement) à vérifier avec le module Rentabilité | `FinanceController.cs` ✅ |
| M5 | Validations d'upload : `Content-Type` déclaratif seulement (pas de signature binaire) ; photos utilisateurs 5 Mo — à durcir | `DocumentService.cs:159`, `UserService.cs:480` |
| M6 | `System.Drawing` pour la signature par initiales → **échec garanti sous Linux/Render** (pas de libgdiplus) | `ElectronicSignatureService.cs:671-683` |
| M7 | `PermissionSyncMiddleware` s'exécute à **chaque requête** (N appels Mongo) ; la version cachée existe et n'est pas branchée | `Program.cs:166`, `PermissionSyncMiddlewareOptimized.cs` |
| M8 | Licences : iText7 (**AGPL v3**), EPPlus (Polyform, non utilisé), QuestPDF Community | `Services.csproj:15,27` |
| M9 | Exports de rapports non implémentés (`ExportReportAsync` → « Export à implémenter »), rapports planifiés sans exécuteur (WorkerService stub) | `ReportService.cs:1015`, `WorkerService/Worker.cs` |
| M10 | Docker backend : conteneur **root**, pas de healthcheck, `env.txt` dans le contexte de build | `Dockerfile:52-64`, `.dockerignore` |

### 4.3 Frontend
| # | Constat | Détail |
|---|---|---|
| M11 | **Aucune gestion 401/refresh** : l'intercepteur est passif, `refreshToken()` jamais appelé → session expirée = écran vide ; le refresh token stocké ne sert à rien | `auth.interceptor.ts`, `auth.ts:59`, `Token/token.ts:91` |
| M12 | **Dashboard affiche des données simulées** (CA, recouvrement, tendances aléatoires) sans avertissement en cas d'échec API | `dashboard.ts:289-293,586-604,668-671,698-722` |
| M13 | **Liens morts de navigation** : `/dashboard/contrats/stats`, `/dashboard/rapports/{impayes,maintenance,assurances,planifies}`, `/dashboard/audit`, `/dashboard/settings/*` | `sidebar-component.html:146,231-249,298-308,317` |
| M14 | **Dockerfile front non fonctionnel** : Node 18 (Angular 21 exige ≥ 20.19), `npm ci --only=production`, `nginx.conf` manquant, chemin `dist/logistiks_frontend` en minuscules ; `DockerfileDockerfile` est un `vercel.json` mal nommé | `Dockerfile`, `DockerfileDockerfile` |
| M15 | Avatars via `ui-avatars.com` copiés ~17 fois (données nominatives envoyées à un tiers) | 34 occurrences |
| M16 | Données PII : logs console (payload JWT corrigé, reste 190+ `console.*`), messages d'erreur bruts | global |
| M17 | A11y faible : `<html lang="en">`, 29 `<img>` pour 3 `alt`, labels sans `for`, `.hintrc` désactive les règles a11y | `index.html`, `.hintrc` |

---

## 5. MOYEN / FAIBLE (extraits)

1. **Performance** : `.Result` bloquants, `Find(_ => true)`, `PageSize` sans plafond, `getCurrentUser()` sans cache (~17 appelants), aucun `OnPush`/`trackBy` (`DashboardService.cs:94,155`, `UserService.cs:1007`).
2. **Réponses API hétérogènes** : 3 formats (`Response`, `ApiResponseData<T>`, objets anonymes), codes HTTP approximatifs (`Forbid("msg")` corrigé, reste `BadRequest` au lieu de 404/409).
3. **Index Mongo créés dans les constructeurs de services scoped** (bloquant par requête ; un doublon existant fait tomber la service) — `ContractService.cs:80-127`, `TierService.cs:37-65`.
4. **Le seeder écrase les permissions des rôles à chaque démarrage** (`RoleSeeder.cs:160-179`).
5. **Code mort / inachevé** : `PermissionSyncMiddlewareOptimized`, scripts maintenance, `contrat-payment-list`/`contrat-statistics` en `works!`, boutons « en cours de développement », `updateUserPermissions` jamais appelé.
6. **Duplication front** : 2 services `Permissions` (dont un mort), `api.ts` mort, enums recopiés (`DocumentType` sans `AddressProof/Report`, `TierRoleType` sans `Prestataire/Employee`, `Permission` front inexistant côté back).
7. **Specs fragiles restantes (5)** : `dashboard` (Chart.js sans canvas en jsdom), `finance-create-transaction`, `finance-transactions`, `users-create`, `vehicule-form` (rendu complet en jsdom — à adapter avec mocks/stubs).
8. **Sécurité restante** : `HealthController` expose l'environnement et `ex.Message` ; `HomeController` idem ; `EmailTestController` renvoie `stackTrace` ; CORS de secours reflète l'`Origin` ; pas de HSTS.

---

## 6. ÉCARTS DOCUMENTATION PDF ↔ CODE

| Sujet | PDF | Code | État |
|---|---|---|---|
| Durée JWT | 1 j / 30 j (RememberMe) | 30 min / 1 j | ✅ corrigé |
| Refresh token | 1 j / 30 j, cohérent JWT | 3 j fixes après rotation | ✅ corrigé |
| Variable MongoDB | `ConnectionStrings__MongoDB` | `DATABASE__ConnectionString` (env.txt) / section `DATABASE` | ⚠️ à aligner (doc ou config, sinon confusion au déploiement) |
| URL frontend | `AppUrls__FrontendBaseUrl` | `AppUrls:FrontendUrl` (`AppUrlsConfig.cs`) | ⚠️ à aligner |
| Reset password | lien 24 h, anti-énumération | anti-énumération ✅ ; durée du token = Identity par défaut (non paramétrée à 24 h) | ⚠️ à vérifier |
| Palette UI | Violette `#696CFF` | bleu/indigo (thème actuel) | ❌ refonte UI |
| Mot de passe | ≥ 8 caractères | ≥ 8 (aucune classe imposée) | ✅ conforme |
| Expéditeur e-mail | `LOGISTIK NOTIFICATION` | templates Razor + Brevo API | ✅ conforme |
| Immuabilité transactions | RG-013/014 | aucun endpoint update/delete ✅ | ✅ conforme |
| Comptabilisation | RG-008/009 : seules les transactions **Paid** | corrigé (statut ajouté + workflow + filtre) | ✅ corrigé |
| Export Excel transactions | ClosedXML XLSX stylisé | `POST /transactions/export` personnalisable | ✅ nouveau |
| CI/CD | GitHub Actions Build + Test + Deploy | `.github/workflows` **vide** | ❌ à créer |
| Rôles | 6 rôles (SUPER_ADMIN…CONSULTANT) | 6 rôles seedés ✅ | ✅ conforme |

---

## 7. PLAN DE REFONTE UI + MOBILE (proposé)

Base : design system dérivé du PDF (palette `#696CFF`, typo unique, cartes, badges, états vides) appliqué **sans réécrire la logique** — les composants existants conservent leurs services et leurs formulaires.

1. **Socle (1 passe)** : `styles.scss` (tokens couleur/typo/espacements/ombre), composants UI partagés (bouton, carte, badge, champ, tableau responsive, dialogue, toast), app shell responsive.
2. **Navigation mobile** : sidebar → drawer + bottom-nav (Tableau de bord, Tiers, Véhicules, Contrats, Finances) ; tableaux → cartes empilées ; formulaires → pleine largeur ; actions en barre fixe.
3. **Écrans prioritaires** (par usage terrain) : Login, Dashboard, Tiers, Véhicules, Contrats, Finances/Transactions, Documents, ROI, Utilisateurs.
4. **Vérification** : `ng build` + tests + captures mobile (390 px) et desktop (1440 px) par écran.

> La refonte se fait écran par écran, avec validation visuelle à chaque étape (pas de « big bang »).

---

## 8. COMMANDES UTILES

```powershell
# Backend
dotnet build Logistiks_Backend.slnx -c Release
dotnet test  Logistiks_Backend.Services.Tests/Logistiks_Backend.Services.Tests.csproj   # aucun test aujourd'hui

# Frontend
npm run build            # build production
npx ng test --watch=false

# Déploiement
# Backend  : Render (Dockerfile port 10000, env vars : DATABASE__*, JwtConfig__*, EmailSettings__*)
# Frontend : Vercel (renommer DockerfileDockerfile → vercel.json) ou Nginx (corriger Dockerfile)
```

---

## 9. CHECKLIST AVANT DÉPLOIEMENT

- [ ] Secrets tournés + historiques purgés (C1)
- [ ] Variables d'environnement vérifiées sur Render (C4)
- [ ] FallbackPolicy + smoke test par rôle (super admin, manager, opérations, finances, livreur, consultant) (C2/C3)
- [ ] Routes manquantes de la §4.1 créées ou appels retirés
- [ ] Dockerfile front corrigé (Node 20+, npm ci complet, nginx.conf) ; `DockerfileDockerfile` renommé `vercel.json`
- [ ] CI GitHub Actions (build + test) sur les deux dépôts
- [ ] Sauvegarde MongoDB avant le premier déploiement des correctifs d'autorisation

---

*Fin de l'audit. Les correctifs de la §2 sont dans le code (non commités). L'historique des constats et les preuves restent valables pour la suite.*
