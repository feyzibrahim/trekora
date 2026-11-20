import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBatchExpenses1790100000000 implements MigrationInterface {
  name = 'AddBatchExpenses1790100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create enums if not exist
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'batch_expenses_category_enum') THEN
          CREATE TYPE "batch_expenses_category_enum" AS ENUM (
            'ticket_booking',
            'hotel_booking',
            'cab_booking',
            'food',
            'activity',
            'guide_fees',
            'permits',
            'equipment',
            'miscellaneous'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'batch_expenses_payment_type_enum') THEN
          CREATE TYPE "batch_expenses_payment_type_enum" AS ENUM (
            'advance',
            'partial',
            'full',
            'balance',
            'reimbursement'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'batch_expenses_payment_mode_enum') THEN
          CREATE TYPE "batch_expenses_payment_mode_enum" AS ENUM (
            'bank_transfer',
            'upi',
            'cash',
            'card',
            'other'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'batch_expenses_status_enum') THEN
          CREATE TYPE "batch_expenses_status_enum" AS ENUM (
            'pending',
            'approved',
            'sent',
            'rejected',
            'cancelled'
          );
        END IF;
      END $$;
    `);

    // 2. Create batch_expenses table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "batch_expenses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "expense_number" character varying NOT NULL,
        "organization_id" uuid NOT NULL,
        "batch_id" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "category" "batch_expenses_category_enum" NOT NULL DEFAULT 'miscellaneous',
        "payment_type" "batch_expenses_payment_type_enum" NOT NULL DEFAULT 'full',
        "amount" numeric(12,2) NOT NULL,
        "vendor_name" character varying(255),
        "payment_mode" "batch_expenses_payment_mode_enum" NOT NULL DEFAULT 'bank_transfer',
        "transfer_account" text NOT NULL,
        "transfer_date" date NOT NULL,
        "remarks" text,
        "bill_attachments" jsonb NOT NULL DEFAULT '[]',
        "status" "batch_expenses_status_enum" NOT NULL DEFAULT 'pending',
        "requested_by_id" uuid NOT NULL,
        "approved_by_id" uuid,
        "approved_at" TIMESTAMP,
        "sent_by_id" uuid,
        "sent_at" TIMESTAMP,
        "transaction_reference" character varying(255),
        "finance_remarks" text,
        "payment_proofs" jsonb NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_batch_expenses_expense_number" UNIQUE ("expense_number"),
        CONSTRAINT "PK_batch_expenses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_batch_expenses_organization" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_batch_expenses_batch" FOREIGN KEY ("batch_id") REFERENCES "batch"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_batch_expenses_requested_by" FOREIGN KEY ("requested_by_id") REFERENCES "user"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_batch_expenses_approved_by" FOREIGN KEY ("approved_by_id") REFERENCES "user"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_batch_expenses_sent_by" FOREIGN KEY ("sent_by_id") REFERENCES "user"("id") ON DELETE SET NULL
      )
    `);

    // 3. Create indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_batch_expenses_org_batch" ON "batch_expenses" ("organization_id", "batch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_batch_expenses_org_status" ON "batch_expenses" ("organization_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_batch_expenses_org_transfer_date" ON "batch_expenses" ("organization_id", "transfer_date")`,
    );

    // 4. Create batch_expense_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "batch_expense_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "expense_id" uuid NOT NULL,
        "changed_by_id" uuid NOT NULL,
        "action" character varying NOT NULL,
        "previous_data" jsonb,
        "new_data" jsonb,
        "note" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_batch_expense_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_batch_expense_logs_expense" FOREIGN KEY ("expense_id") REFERENCES "batch_expenses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_batch_expense_logs_changed_by" FOREIGN KEY ("changed_by_id") REFERENCES "user"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_batch_expense_logs_expense" ON "batch_expense_logs" ("expense_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "batch_expense_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "batch_expenses"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "batch_expenses_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "batch_expenses_payment_mode_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "batch_expenses_payment_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "batch_expenses_category_enum"`);
  }
}
