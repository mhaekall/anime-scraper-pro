# Q5: Drizzle ORM Indexes + Zero-Downtime Migration

## Schema dengan Composite Index
```typescript
// db/schema.ts
import { 
  pgTable, text, integer, timestamp, boolean, 
  serial, unique, index 
} from "drizzle-orm/pg-core";

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
}, (table) => ({
  unq: unique().on(table.userId, table.animeSlug, table.episode),
  
  // INDEX 1: User History Order
  userUpdatedAtIdx: index("wh_user_updated_at_idx")
    .on(table.userId, table.updatedAt),
  
  // INDEX 2: Specific Episode Lookup
  userSlugEpisodeIdx: index("wh_user_slug_ep_idx")
    .on(table.userId, table.animeSlug, table.episode),
  
  // INDEX 3: Filtering Incomplete
  userCompletedIdx: index("wh_user_completed_idx")
    .on(table.userId, table.completed, table.updatedAt),
}));
```

## Urutan Migration Zero-Downtime
Jalankan manual di Neon SQL Editor satu per satu untuk menghindari table lock:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS "wh_user_updated_at_idx" 
  ON "watch_history" ("userId", "updatedAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "wh_user_slug_ep_idx"
  ON "watch_history" ("userId", "animeSlug", "episode");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "wh_user_completed_idx"
  ON "watch_history" ("userId", "completed", "updatedAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "bm_user_updated_idx"
  ON "bookmarks" ("userId", "updatedAt" DESC);
```
