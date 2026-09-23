ALTER TABLE "orders" ADD COLUMN "scheduled_status" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "scheduled_status_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "orders_scheduled_status_at_idx" ON "orders" USING btree ("scheduled_status_at");