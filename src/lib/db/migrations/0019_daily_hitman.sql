ALTER TABLE "order_statuses" ADD COLUMN "client_uploads_photo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "order_statuses" ADD COLUMN "client_photo_next_status" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "client_photo_key" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "client_photo" jsonb;