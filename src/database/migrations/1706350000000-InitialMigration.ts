import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1706350000000 implements MigrationInterface {
  name = 'InitialMigration1706350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "users_status_enum" AS ENUM('registered', 'active', 'expired', 'removed')
    `);

    await queryRunner.query(`
      CREATE TYPE "subscriptions_status_enum" AS ENUM('pending', 'active', 'expiring_soon', 'expired', 'cancelled')
    `);

    await queryRunner.query(`
      CREATE TYPE "payments_status_enum" AS ENUM('pending', 'processing', 'completed', 'cancelled', 'failed', 'refunded')
    `);

    await queryRunner.query(`
      CREATE TYPE "notifications_type_enum" AS ENUM('expiry_warning_1', 'expiry_warning_2', 'final_warning', 'removal_notice', 'welcome', 'payment_success', 'broadcast')
    `);

    await queryRunner.query(`
      CREATE TYPE "notifications_status_enum" AS ENUM('pending', 'sent', 'failed')
    `);

    await queryRunner.query(`
      CREATE TYPE "broadcasts_type_enum" AS ENUM('text', 'photo', 'video', 'document')
    `);

    await queryRunner.query(`
      CREATE TYPE "broadcasts_status_enum" AS ENUM('pending', 'in_progress', 'completed', 'cancelled')
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "telegramId" bigint NOT NULL,
        "username" character varying(255),
        "fullName" character varying(255) NOT NULL,
        "phoneNumber" character varying(20) NOT NULL,
        "status" "users_status_enum" NOT NULL DEFAULT 'registered',
        "isBlocked" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_telegramId" UNIQUE ("telegramId"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_telegramId" ON "users" ("telegramId")
    `);

    // Create channels table
    await queryRunner.query(`
      CREATE TABLE "channels" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "description" character varying(500),
        "telegramChannelId" bigint NOT NULL,
        "telegramChannelUsername" character varying(255),
        "price" decimal(12,2) NOT NULL,
        "durationDays" integer NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_channels" PRIMARY KEY ("id")
      )
    `);

    // Create subscriptions table
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "channelId" uuid NOT NULL,
        "startDate" TIMESTAMP,
        "endDate" TIMESTAMP,
        "status" "subscriptions_status_enum" NOT NULL DEFAULT 'pending',
        "inviteLink" character varying(255),
        "inviteLinkUsed" boolean NOT NULL DEFAULT false,
        "userJoined" boolean NOT NULL DEFAULT false,
        "userRemoved" boolean NOT NULL DEFAULT false,
        "notificationsSent" integer NOT NULL DEFAULT 0,
        "lastNotificationAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subscriptions_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_subscriptions_channelId" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_subscriptions_userId_channelId" ON "subscriptions" ("userId", "channelId")
    `);

    // Create payments table
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "subscriptionId" uuid,
        "channelId" uuid,
        "orderId" character varying(255) NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "status" "payments_status_enum" NOT NULL DEFAULT 'pending',
        "paymeTransactionId" character varying(255),
        "paymeTransactionTime" TIMESTAMP,
        "performTime" TIMESTAMP,
        "cancelTime" TIMESTAMP,
        "cancelReason" integer,
        "metadata" jsonb,
        "paymentUrl" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_payments_orderId" UNIQUE ("orderId"),
        CONSTRAINT "PK_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payments_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_payments_orderId" ON "payments" ("orderId")
    `);

    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "subscriptionId" uuid,
        "type" "notifications_type_enum" NOT NULL,
        "status" "notifications_status_enum" NOT NULL DEFAULT 'pending',
        "message" text NOT NULL,
        "sentAt" TIMESTAMP,
        "errorMessage" text,
        "retryCount" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_userId_type_createdAt" ON "notifications" ("userId", "type", "createdAt")
    `);

    // Create broadcasts table
    await queryRunner.query(`
      CREATE TABLE "broadcasts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "adminId" bigint NOT NULL,
        "type" "broadcasts_type_enum" NOT NULL DEFAULT 'text',
        "text" text,
        "mediaFileId" character varying(500),
        "caption" text,
        "status" "broadcasts_status_enum" NOT NULL DEFAULT 'pending',
        "totalUsers" integer NOT NULL DEFAULT 0,
        "sentCount" integer NOT NULL DEFAULT 0,
        "failedCount" integer NOT NULL DEFAULT 0,
        "startedAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_broadcasts" PRIMARY KEY ("id")
      )
    `);

    // Enable uuid-ossp extension if not exists
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "broadcasts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "channels"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_userId_type_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_orderId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subscriptions_userId_channelId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_telegramId"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "broadcasts_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "broadcasts_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notifications_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notifications_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payments_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscriptions_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_status_enum"`);
  }
}
