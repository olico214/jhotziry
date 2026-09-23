ALTER TABLE "drafts" ADD COLUMN "source_image_key" text;--> statement-breakpoint
ALTER TABLE "drafts" ADD COLUMN "preview_image_key" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "image_key" text;