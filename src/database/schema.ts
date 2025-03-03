import { relations } from "drizzle-orm";
import { timestamp, integer, pgTable, text, serial } from "drizzle-orm/pg-core";

export const managers = pgTable("managers", {
	managerId: serial().primaryKey(),
	managerName: text().unique().notNull(),
});
export type Manager = typeof managers.$inferSelect;

export const players = pgTable("players", {
	playerId: serial().primaryKey(),
	email: text().unique().notNull(),
	passwordHash: text().notNull(),
	username: text().unique().notNull(),
});
export type Player = typeof players.$inferSelect;

export const playerStats = pgTable("player_stats", {
	playerId: serial()
		.primaryKey()
		.references(() => players.playerId, {
			onDelete: "cascade",
		})
		.notNull(),
	playerLevel: integer().notNull(),
	coins: integer().notNull(),
	experiencePoints: integer().notNull(),
});
export type PlayerStats = typeof playerStats.$inferSelect;

export const playerSessions = pgTable("player_sessions", {
	id: text().primaryKey(),
	playerId: serial().references(() => players.playerId, {
		onDelete: "cascade",
	}),
	expiresAt: timestamp("expires_at", {
		mode: "date",
		withTimezone: true,
	}).notNull(),
	createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
		.notNull()
		.defaultNow(),
});
export type PlayerSession = typeof playerSessions.$inferSelect;

export const locations = pgTable("locations", {
	locationId: serial().primaryKey(),
	name: text().notNull(),
	unlocksAt: integer().notNull(),
	coinsNeeded: integer().notNull(),
});
export type Location = typeof locations.$inferSelect;

export const locationLevels = pgTable("location_levels", {
	levelId: serial().primaryKey(),
	level: integer().unique(),
	locationId: serial()
		.notNull()
		.references(() => locations.locationId, { onDelete: "cascade" }),
	scoreRequired: integer().notNull(),
});
export type LocationLevel = typeof locationLevels.$inferSelect;

export const playerRelations = relations(players, ({ many }) => ({
	sessions: many(playerSessions, {
		relationName: "player",
	}),
}));

export const playerSessionsRelations = relations(playerSessions, ({ one }) => ({
	player: one(players, {
		fields: [playerSessions.playerId],
		references: [players.playerId],
		relationName: "player",
	}),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
	levels: many(locationLevels, { relationName: "levels" }),
}));

export const locationLevelsRelations = relations(locationLevels, ({ one }) => ({
	location: one(locations, {
		fields: [locationLevels.locationId],
		references: [locations.locationId],
		relationName: "levels",
	}),
}));
