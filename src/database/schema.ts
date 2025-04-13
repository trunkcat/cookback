import { relations, sql } from "drizzle-orm";
import {
	check,
	integer,
	pgEnum,
	pgTable,
	point,
	primaryKey,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

const primaryInt = () => integer().primaryKey().generatedAlwaysAsIdentity();

const placeIdReference = () =>
	integer()
		.references(() => place.placeId, { onDelete: "cascade" })
		.notNull();
const playerIdReference = () =>
	uuid()
		.references(() => player.playerId, { onDelete: "cascade" })
		.notNull();

const timestamps = {
	createdAt: timestamp({ mode: "date", withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp({ mode: "date", withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
};

export const player = pgTable("players", {
	playerId: uuid().defaultRandom().primaryKey(),
	username: text().unique().notNull(),
	email: text().unique().notNull(),
	passwordHash: text().notNull(),
	...timestamps,
});

export const playerRelations = relations(player, ({ many, one }) => ({
	sessions: many(playerSession, { relationName: "player_sessions" }),
	stats: one(playerStats, {
		fields: [player.playerId],
		references: [playerStats.playerId],
		relationName: "player_stats",
	}),
	unlockedPlaces: many(unlockedPlace, {
		relationName: "player_unlocked_places",
	}),
	levelGoalProgresses: many(placeLevelGoalProgress, {
		relationName: "player_level_goal_progresses",
	}),
	itemUpgrades: many(placeItemUpgrade, {
		relationName: "player_place_item_upgrades",
	}),
}));

export const playerSession = pgTable("player_sessions", {
	playerSessionId: text().primaryKey(),
	playerId: playerIdReference(),
	expiresAt: timestamp({ mode: "date", withTimezone: true }).notNull(),
	...timestamps,
});

export const playerSessionRelations = relations(
	playerSession,
	({ one }) => ({
		player: one(player, {
			fields: [playerSession.playerId],
			references: [player.playerId],
			relationName: "player_sessions",
		}),
	}),
);

export const playerStats = pgTable("player_stats", {
	playerId: playerIdReference().primaryKey(),
	playerLevel: integer().notNull(),
	coins: integer().notNull(),
	experiencePoints: integer().notNull(),
	...timestamps,
});

export const playerStatsRelations = relations(playerStats, ({ one }) => ({
	player: one(player, {
		fields: [playerStats.playerId],
		references: [player.playerId],
		relationName: "player_stats",
	}),
}));

export const managerRole = pgEnum("manager_roles", ["manager", "supermanager"]);

export const manager = pgTable("managers", {
	managerId: uuid().defaultRandom().primaryKey(),
	username: text().unique().notNull(),
	email: text().unique().notNull(),
	passwordHash: text().notNull(),
	role: managerRole().notNull(),
	...timestamps,
});

export const managerRelations = relations(manager, ({ many }) => ({
	sessions: many(managerSession, { relationName: "manager_sessions" }),
}));

export const managerSession = pgTable("manager_sessions", {
	managerSessionId: text().primaryKey(),
	managerId: uuid()
		.references(() => manager.managerId, { onDelete: "cascade" })
		.notNull(),
	expiresAt: timestamp({ mode: "date", withTimezone: true }).notNull(),
	...timestamps,
});

export const managerSessionRelations = relations(
	managerSession,
	({ one }) => ({
		manager: one(manager, {
			fields: [managerSession.managerId],
			references: [manager.managerId],
			relationName: "manager_sessions",
		}),
	}),
);

export const placeType = pgEnum("place_types", ["restaurant"]);

export const place = pgTable("places", {
	placeId: primaryInt(),
	type: placeType().notNull(),
	name: text().notNull().unique(),
	unlocksAt: integer().notNull(),
	price: integer().notNull(),
	position: point().notNull(),
	description: text().notNull(),
	...timestamps,
}, (table) => [
	check("place_price_check", sql`${table.price} >= 0`),
	check("place_unlocks_at_check", sql`${table.unlocksAt} >= 1`),
]);

export const placeRelations = relations(place, ({ many }) => ({
	levels: many(placeLevel, { relationName: "place_levels" }),
	items: many(placeItem, { relationName: "place_items" }),
	unlocks: many(unlockedPlace, { relationName: "place_unlocks" }),
}));

export const unlockedPlace = pgTable("unlocked_places", {
	placeId: placeIdReference(),
	playerId: playerIdReference(),
	...timestamps,
}, (table) => [
	primaryKey({ columns: [table.placeId, table.playerId] }),
]);

export const unlockedPlaceRelations = relations(
	unlockedPlace,
	({ one }) => ({
		place: one(place, {
			fields: [unlockedPlace.placeId],
			references: [place.placeId],
			relationName: "place_unlocks",
		}),
		player: one(player, {
			fields: [unlockedPlace.playerId],
			references: [player.playerId],
			relationName: "player_unlocked_places",
		}),
	}),
);

export const placeLevel = pgTable("place_levels", {
	levelId: primaryInt(),
	placeId: placeIdReference(),
	levelNo: integer().notNull(),
	...timestamps,
}, (table) => [
	unique().on(table.placeId, table.levelNo),
]);

export const placeLevelRelations = relations(placeLevel, ({ many, one }) => ({
	place: one(place, {
		fields: [placeLevel.placeId],
		references: [place.placeId],
		relationName: "place_levels",
	}),
	goals: many(placeLevelGoal, { relationName: "place_level_goals" }),
}));

export const goalType = pgEnum(
	"place_level_goal_types",
	["coins", "tip", "xp", "customers"],
);

export const placeLevelGoal = pgTable("place_level_goals", {
	goalId: primaryInt(),
	levelId: integer()
		.references(() => placeLevel.levelId, { onDelete: "cascade" })
		.notNull(),
	goalType: goalType().notNull(),
	goalValue: integer().notNull(),
	...timestamps,
}, (table) => [
	unique().on(table.levelId, table.goalType),
]);

export const placeLevelGoalRelations = relations(
	placeLevelGoal,
	({ many, one }) => ({
		level: one(placeLevel, {
			fields: [placeLevelGoal.levelId],
			references: [placeLevel.levelId],
			relationName: "place_level_goals",
		}),
		progresses: many(placeLevelGoalProgress, {
			relationName: "level_goal_progresses",
		}),
	}),
);

export const placeLevelGoalProgress = pgTable("place_level_goal_progresses", {
	goalId: integer().references(() => placeLevelGoal.goalId).notNull(),
	playerId: playerIdReference(),
	obtainedValue: integer().notNull(),
	...timestamps,
}, (table) => [
	primaryKey({ columns: [table.goalId, table.playerId] }),
]);

export const placeLevelGoalProgressRelations = relations(
	placeLevelGoalProgress,
	({ one }) => ({
		goal: one(placeLevelGoal, {
			fields: [placeLevelGoalProgress.goalId],
			references: [placeLevelGoal.goalId],
			relationName: "level_goal_progresses",
		}),
		player: one(player, {
			fields: [placeLevelGoalProgress.playerId],
			references: [player.playerId],
			relationName: "player_level_goal_progresses",
		}),
	}),
);

export const placeItem = pgTable("place_items", {
	itemId: primaryInt(),
	placeId: placeIdReference(),
	gameItem: text().notNull(),
	unlocksIn: integer()
		.references(() => placeLevel.levelId, { onDelete: "cascade" })
		.notNull(),
	maxLevel: integer().notNull(),
	...timestamps,
}, (table) => [
	unique().on(table.gameItem, table.placeId),
]);

export const placeItemRelations = relations(placeItem, ({ many, one }) => ({
	place: one(place, {
		fields: [placeItem.placeId],
		references: [place.placeId],
		relationName: "place_items",
	}),
	upgrades: many(placeItemUpgrade, { relationName: "place_item_upgrades" }),
}));

export const placeItemUpgrade = pgTable("place_item_upgrades", {
	itemId: integer().references(() => placeItem.itemId).notNull(),
	playerId: playerIdReference(),
	level: integer().notNull(),
	...timestamps,
}, (table) => [
	primaryKey({ columns: [table.itemId, table.playerId] }),
]);

export const placeItemUpgradeRelations = relations(
	placeItemUpgrade,
	({ one }) => ({
		item: one(placeItem, {
			fields: [placeItemUpgrade.itemId],
			references: [placeItem.itemId],
			relationName: "place_item_upgrades",
		}),
		player: one(player, {
			fields: [placeItemUpgrade.playerId],
			references: [player.playerId],
			relationName: "player_place_item_upgrades",
		}),
	}),
);
