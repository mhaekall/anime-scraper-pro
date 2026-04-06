import { pgTable, text, integer, timestamp, boolean, serial, unique, index, jsonb } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("emailVerified").notNull(),
	image: text("image"),
	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull()
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expiresAt").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull(),
	ipAddress: text("ipAddress"),
	userAgent: text("userAgent"),
	userId: text("userId").notNull().references(() => user.id)
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("accountId").notNull(),
	providerId: text("providerId").notNull(),
	userId: text("userId").notNull().references(() => user.id),
	accessToken: text("accessToken"),
	refreshToken: text("refreshToken"),
	idToken: text("idToken"),
	accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
	refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull()
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expiresAt").notNull(),
	createdAt: timestamp("createdAt"),
	updatedAt: timestamp("updatedAt")
});

export const watchHistory = pgTable("watch_history", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  animeSlug: text("animeSlug").notNull(),
  animeTitle: text("animeTitle").notNull(),
  animeCover: text("animeCover"),
  episode: integer("episode").notNull(),
  episodeTitle: text("episodeTitle"),
  timestampSec: integer("timestampSec").notNull().default(0),
  durationSec: integer("durationSec").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  source: text("source").default("oploverz"),
  quality: text("quality").default("720p"),
  updatedAt: timestamp("updatedAt").notNull()
}, (t) => ({
  unq: unique().on(t.userId, t.animeSlug, t.episode),
  userUpdatedAtIdx: index("wh_user_updated_at_idx").on(t.userId, t.updatedAt),
  userSlugEpisodeIdx: index("wh_user_slug_ep_idx").on(t.userId, t.animeSlug, t.episode),
  userCompletedIdx: index("wh_user_completed_idx").on(t.userId, t.completed, t.updatedAt),
}));

export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  animeSlug: text("animeSlug").notNull(),
  status: text("status").default("plan_to_watch"),
  updatedAt: timestamp("updatedAt").notNull()
}, (t) => ({
  unq: unique().on(t.userId, t.animeSlug),
  userUpdatedAtIdx: index("bm_user_updated_idx").on(t.userId, t.updatedAt),
}));

export const animeMetadata = pgTable("anime_metadata", {
  anilistId: integer("anilistId").primaryKey(),
  cleanTitle: text("cleanTitle").notNull(),
  nativeTitle: text("nativeTitle"),
  coverImage: text("coverImage"),
  bannerImage: text("bannerImage"),
  synopsis: text("synopsis"),
  score: integer("score"),
  status: text("status"),
  totalEpisodes: integer("totalEpisodes"),
  season: text("season"),
  year: integer("year"),
  studios: jsonb("studios"),
  genres: jsonb("genres"),
  recommendations: jsonb("recommendations"),
  nextAiringEpisode: jsonb("nextAiringEpisode"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow()
});

export const animeMappings = pgTable("anime_mappings", {
  id: serial("id").primaryKey(),
  anilistId: integer("anilistId").notNull().references(() => animeMetadata.anilistId, { onDelete: "cascade" }),
  providerId: text("providerId").notNull(), // e.g. "oploverz", "otakudesu"
  providerSlug: text("providerSlug").notNull(), // The raw slug from the provider
  updatedAt: timestamp("updatedAt").notNull().defaultNow()
}, (t) => ({
  unqMapping: unique().on(t.providerId, t.providerSlug),
  anilistIdx: index("mapping_anilist_idx").on(t.anilistId)
}));

