-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN_HR', 'STAFF_HR', 'APPROVER', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LetterStatus" AS ENUM ('DRAFT', 'REVIEW', 'REVISION', 'APPROVED', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'SUBMIT_APPROVAL', 'APPROVE', 'REJECT', 'REVISION_REQUEST', 'PUBLISH', 'LOGIN', 'LOGOUT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(180) NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "refreshTokenHash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "letter_categories" (
    "id" UUID NOT NULL,
    "category_name" VARCHAR(120) NOT NULL,
    "category_code" VARCHAR(20) NOT NULL,
    "numbering_format" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "letter_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "letter_templates" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "template_name" VARCHAR(160) NOT NULL,
    "template_content" TEXT NOT NULL,
    "docx_template_path" TEXT,
    "placeholders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "TemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "letter_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "letter_sequences" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "letter_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "letters" (
    "id" UUID NOT NULL,
    "letter_number" VARCHAR(80),
    "category_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "approver_id" UUID,
    "status" "LetterStatus" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB NOT NULL,
    "generated_docx" TEXT,
    "generated_pdf" TEXT,
    "approved_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" UUID NOT NULL,
    "letter_id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" "AuditAction" NOT NULL,
    "entity" VARCHAR(80) NOT NULL,
    "entity_id" VARCHAR(80),
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" VARCHAR(80),
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "letter_categories_category_code_key" ON "letter_categories"("category_code");

-- CreateIndex
CREATE INDEX "letter_templates_category_id_status_idx" ON "letter_templates"("category_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "letter_templates_category_id_template_name_version_key" ON "letter_templates"("category_id", "template_name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "letter_sequences_category_id_month_year_key" ON "letter_sequences"("category_id", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "letters_letter_number_key" ON "letters"("letter_number");

-- CreateIndex
CREATE INDEX "letters_status_created_at_idx" ON "letters"("status", "created_at");

-- CreateIndex
CREATE INDEX "letters_category_id_status_idx" ON "letters"("category_id", "status");

-- CreateIndex
CREATE INDEX "approvals_letter_id_status_idx" ON "approvals"("letter_id", "status");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_timestamp_idx" ON "audit_logs"("user_id", "timestamp");

-- AddForeignKey
ALTER TABLE "letter_templates" ADD CONSTRAINT "letter_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "letter_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_sequences" ADD CONSTRAINT "letter_sequences_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "letter_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "letter_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "letter_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_letter_id_fkey" FOREIGN KEY ("letter_id") REFERENCES "letters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
