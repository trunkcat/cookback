import { relations } from "drizzle-orm";
import { integer, pgTable, text, serial } from "drizzle-orm/pg-core";

export const COIN_LIMIT = 20000000;

export const managers = pgTable("managers", {
	managerId: serial().primaryKey(),
	managerName: text().unique().notNull(),
});

export const players = pgTable("players", {
	playerId: serial().primaryKey(),
	email: text().unique().notNull(),
	passwordHash: text().notNull(),
	username: text().unique().notNull(),
});

export const stats = pgTable("player_stats", {
	playerId: serial()
		.primaryKey()
		.references(() => players.playerId),
	playerLevel: integer().notNull(),
	coins: integer().notNull(),
	experiencePoints: integer().notNull(),
});

// TODO: SHOULD PLAYER LEVELS BE LIKE A KNOWN-CONSTANT?

// GAME MECHANICS

export const locations = pgTable("locations", {
	locationId: serial().primaryKey(),
	name: text().notNull(),
	unlocksAt: integer().notNull(),
	coinsNeeded: integer().notNull(),
});

export const locationsRelations = relations(locations, ({ many }) => ({
	levels: many(locationLevels, { relationName: "levels" }),
}));

export const locationLevels = pgTable("location_levels", {
	levelId: serial().primaryKey(),
	level: integer().unique(),
	locationId: serial()
		.notNull()
		.references(() => locations.locationId),
	scoreRequired: integer().notNull(),
});

export const locationLevelsRelations = relations(locationLevels, ({ one }) => ({
	location: one(locations, {
		fields: [locationLevels.locationId],
		references: [locations.locationId],
		relationName: "levels",
	}),
}));
