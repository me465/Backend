-- ==============================================================================
-- Script d'initialisation et de migration de la base de données PostgreSQL
-- Projet : YomanKash Backend API
-- ==============================================================================

-- Activation de l'extension pour la génération d'UUID v4
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table : Businesses (Entreprises)
CREATE TABLE IF NOT EXISTS "Businesses" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nom" VARCHAR(255) NOT NULL,
    "plan" VARCHAR(50) DEFAULT 'business',
    "subscriptionStatus" VARCHAR(50) DEFAULT 'trial',
    "trialEndsAt" TIMESTAMP WITH TIME ZONE,
    "subscriptionEndsAt" TIMESTAMP WITH TIME ZONE,
    "proprietaireId" UUID,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Table : Users (Utilisateurs & Membres)
CREATE TABLE IF NOT EXISTS "Users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50) UNIQUE,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "companyName" VARCHAR(255),
    "password" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'FOYER',
    "plan" VARCHAR(50) NOT NULL DEFAULT 'foyer',
    "subscriptionStatus" VARCHAR(50) DEFAULT 'none',
    "trialEndsAt" TIMESTAMP WITH TIME ZONE,
    "subscriptionEndsAt" TIMESTAMP WITH TIME ZONE,
    "businessId" UUID REFERENCES "Businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "managerId" UUID REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "actif" BOOLEAN DEFAULT true,
    "otp" VARCHAR(255),
    "otpExpires" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ajout de la contrainte de clé étrangère sur Businesses.proprietaireId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_businesses_proprietaire'
    ) THEN
        ALTER TABLE "Businesses" 
        ADD CONSTRAINT fk_businesses_proprietaire 
        FOREIGN KEY ("proprietaireId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 3. Table : Produits (Stock & Catalogue)
CREATE TABLE IF NOT EXISTS "Produits" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "nom" VARCHAR(255) NOT NULL,
    "categorie" VARCHAR(100) DEFAULT 'Général',
    "prixAchat" NUMERIC(15, 2) DEFAULT 0,
    "prixVente" NUMERIC(15, 2) DEFAULT 0,
    "quantiteStock" INTEGER DEFAULT 0,
    "seuilAlerte" INTEGER DEFAULT 5,
    "unite" VARCHAR(50) DEFAULT 'pièce',
    "codeBarre" VARCHAR(255),
    "businessId" UUID NOT NULL REFERENCES "Businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Table : Clients
CREATE TABLE IF NOT EXISTS "Clients" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL REFERENCES "Businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "nom" VARCHAR(255) NOT NULL,
    "telephone" VARCHAR(50),
    "adresse" TEXT,
    "statut" VARCHAR(50) DEFAULT 'ACTIF',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Table : Ventes
CREATE TABLE IF NOT EXISTS "Ventes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL REFERENCES "Businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "vendeurId" UUID REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "clientId" UUID REFERENCES "Clients"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "statutPaiement" VARCHAR(50) DEFAULT 'PAYE',
    "montantTotal" NUMERIC(15, 2) NOT NULL DEFAULT 0,
    "montantPaye" NUMERIC(15, 2) NOT NULL DEFAULT 0,
    "dateVente" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. Table : LignesVente
CREATE TABLE IF NOT EXISTS "LignesVente" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "venteId" UUID NOT NULL REFERENCES "Ventes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "produitId" UUID NOT NULL REFERENCES "Produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prixUnitaire" NUMERIC(15, 2) NOT NULL DEFAULT 0,
    "sousTotal" NUMERIC(15, 2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. Table : Achats (Dépenses / Approvisionnements Business)
CREATE TABLE IF NOT EXISTS "Achats" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL REFERENCES "Businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "acheteurId" UUID REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "fournisseur" VARCHAR(255),
    "description" TEXT,
    "montantTotal" NUMERIC(15, 2) NOT NULL DEFAULT 0,
    "dateAchat" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. Table : DettesClient
CREATE TABLE IF NOT EXISTS "DettesClient" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "businessId" UUID NOT NULL REFERENCES "Businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "clientId" UUID NOT NULL REFERENCES "Clients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "venteId" UUID REFERENCES "Ventes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "montantInitial" NUMERIC(15, 2) NOT NULL,
    "montantRestant" NUMERIC(15, 2) NOT NULL,
    "statut" VARCHAR(50) DEFAULT 'EN_COURS',
    "dateEcheance" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 9. Table : Remboursements
CREATE TABLE IF NOT EXISTS "Remboursements" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "detteId" UUID NOT NULL REFERENCES "DettesClient"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "montant" NUMERIC(15, 2) NOT NULL,
    "dateRemboursement" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 10. Table : Notifications
CREATE TABLE IF NOT EXISTS "Notifications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "titre" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "lu" BOOLEAN DEFAULT false,
    "type" VARCHAR(50) DEFAULT 'info',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 11. Table : otps (Codes de validation à usage unique)
CREATE TABLE IF NOT EXISTS "otps" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "code_hash" VARCHAR(255) NOT NULL,
    "expiration_time" TIMESTAMP WITH TIME ZONE NOT NULL,
    "used" BOOLEAN DEFAULT false,
    "attempts" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Table : FamilyBudgets (Budget Foyer)
CREATE TABLE IF NOT EXISTS "FamilyBudgets" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "monthlyIncome" NUMERIC(15, 2) DEFAULT 0,
    "savingsGoal" NUMERIC(15, 2) DEFAULT 0,
    "month" VARCHAR(20) NOT NULL,
    "year" INTEGER NOT NULL,
    "categories" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 13. Table : FamilyExpenses (Dépenses Foyer)
CREATE TABLE IF NOT EXISTS "FamilyExpenses" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "category" VARCHAR(100) NOT NULL,
    "amount" NUMERIC(15, 2) NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "paymentMethod" VARCHAR(50),
    "isRecurring" BOOLEAN DEFAULT false,
    "tags" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 14. Table : Subscriptions (Abonnements Business)
CREATE TABLE IF NOT EXISTS "Subscriptions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "businessId" UUID REFERENCES "Businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "plan" VARCHAR(50) DEFAULT 'business',
    "type" VARCHAR(50) DEFAULT 'monthly',
    "paymentMethod" VARCHAR(50),
    "montant" NUMERIC(15, 2) DEFAULT 0,
    "devise" VARCHAR(10) DEFAULT 'FCFA',
    "durationMonths" INTEGER DEFAULT 1,
    "status" VARCHAR(50) DEFAULT 'active',
    "startDate" TIMESTAMP WITH TIME ZONE,
    "endDate" TIMESTAMP WITH TIME ZONE,
    "transactionReference" VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEX DE PERFORMANCE ET SÉCURITÉ
-- ==============================================================================
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "Users"("email");
CREATE INDEX IF NOT EXISTS "idx_users_businessId" ON "Users"("businessId");
CREATE INDEX IF NOT EXISTS "idx_produits_businessId" ON "Produits"("businessId");
CREATE INDEX IF NOT EXISTS "idx_ventes_businessId" ON "Ventes"("businessId");
CREATE INDEX IF NOT EXISTS "idx_ventes_date" ON "Ventes"("dateVente");
CREATE INDEX IF NOT EXISTS "idx_lignes_venteId" ON "LignesVente"("venteId");
CREATE INDEX IF NOT EXISTS "idx_achats_businessId" ON "Achats"("businessId");
CREATE INDEX IF NOT EXISTS "idx_dettes_businessId" ON "DettesClient"("businessId");
CREATE INDEX IF NOT EXISTS "idx_dettes_clientId" ON "DettesClient"("clientId");
CREATE INDEX IF NOT EXISTS "idx_otps_email" ON "otps"("email");
CREATE INDEX IF NOT EXISTS "idx_otps_phone" ON "otps"("phone");
CREATE INDEX IF NOT EXISTS "idx_family_expenses_userId" ON "FamilyExpenses"("userId");
