CREATE TABLE "anime_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"anilistId" integer NOT NULL,
	"providerId" text NOT NULL,
	"providerSlug" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "anime_mappings_providerId_providerSlug_unique" UNIQUE("providerId","providerSlug")
);
--> statement-breakpoint
CREATE TABLE "anime_metadata" (
	"anilistId" integer PRIMARY KEY NOT NULL,
	"cleanTitle" text NOT NULL,
	"nativeTitle" text,
	"coverImage" text,
	"bannerImage" text,
	"synopsis" text,
	"score" integer,
	"status" text,
	"totalEpisodes" integer,
	"season" text,
	"year" integer,
	"studios" jsonb,
	"genres" jsonb,
	"recommendations" jsonb,
	"nextAiringEpisode" jsonb,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "anime_mappings" ADD CONSTRAINT "anime_mappings_anilistId_anime_metadata_anilistId_fk" FOREIGN KEY ("anilistId") REFERENCES "public"."anime_metadata"("anilistId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mapping_anilist_idx" ON "anime_mappings" USING btree ("anilistId");--> statement-breakpoint
CREATE INDEX "bm_user_updated_idx" ON "bookmarks" USING btree ("userId","updatedAt");--> statement-breakpoint
CREATE INDEX "wh_user_updated_at_idx" ON "watch_history" USING btree ("userId","updatedAt");--> statement-breakpoint
CREATE INDEX "wh_user_slug_ep_idx" ON "watch_history" USING btree ("userId","animeSlug","episode");--> statement-breakpoint
CREATE INDEX "wh_user_completed_idx" ON "watch_history" USING btree ("userId","completed","updatedAt");