import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrgDeletionRequestsAndSalaryIncentives1790200000000
  implements MigrationInterface
{
  name = 'AddOrgDeletionRequestsAndSalaryIncentives1790200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create organization_deletion_request table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_deletion_request" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "requested_by_user_id" uuid NOT NULL,
        "required_admin_user_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "approved_by_user_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "rejected_by_user_id" uuid,
        "status" character varying NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organization_deletion_request_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_org_deletion_req_organization'
        ) THEN
          ALTER TABLE "organization_deletion_request"
          ADD CONSTRAINT "FK_org_deletion_req_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_org_deletion_req_requested_by'
        ) THEN
          ALTER TABLE "organization_deletion_request"
          ADD CONSTRAINT "FK_org_deletion_req_requested_by"
          FOREIGN KEY ("requested_by_user_id") REFERENCES "user"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_org_deletion_req_org_status"
      ON "organization_deletion_request" ("organization_id", "status")
    `);

    // 2. Add itemized incentive columns to employee_salary
    await queryRunner.query(`
      ALTER TABLE "employee_salary"
      ADD COLUMN IF NOT EXISTS "incentive_mode" character varying NOT NULL DEFAULT 'simple'
    `);

    await queryRunner.query(`
      ALTER TABLE "employee_salary"
      ADD COLUMN IF NOT EXISTS "incentive_items" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employee_salary" DROP COLUMN IF EXISTS "incentive_items"
    `);
    await queryRunner.query(`
      ALTER TABLE "employee_salary" DROP COLUMN IF EXISTS "incentive_mode"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_org_deletion_req_org_status"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "organization_deletion_request"
    `);
  }
}
