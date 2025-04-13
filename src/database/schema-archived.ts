import { relations } from "drizzle-orm";
import {
	integer,
	pgEnum,
	pgTable,
	point,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

// LOW LEVEL
export const players = pgTable("players", {
	playerId: serial().primaryKey(),
	username: text().unique().notNull(),
	email: text().unique().notNull(),
	passwordHash: text().notNull(),
});
export type Player = typeof players.$inferSelect;

export const playerSessions = pgTable("player_sessions", {
	id: text().primaryKey(),
	playerId: serial()
		.references(() => players.playerId, { onDelete: "cascade" }),
	expiresAt: timestamp("expires_at", {
		mode: "date",
		withTimezone: true,
	}).notNull(),
	createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
		.notNull()
		.defaultNow(),
});
export type PlayerSession = typeof playerSessions.$inferSelect;

export const managers = pgTable("managers", {
	managerId: serial().primaryKey(),
	username: text().unique().notNull(),
	passwordHash: text().notNull(),
});
export type Manager = typeof managers.$inferSelect;

export const managerSessions = pgTable("player_sessions", {
	id: text().primaryKey(),
	managerId: serial()
		.references(() => managers.managerId, { onDelete: "cascade" }),
	expiresAt: timestamp("expires_at", {
		mode: "date",
		withTimezone: true,
	}).notNull(),
	createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
		.notNull()
		.defaultNow(),
});
export type ManagerSession = typeof managerSessions.$inferSelect;

// PLAYER DATA
export const playerStats = pgTable("player_stats", {
	playerId: serial()
		.primaryKey()
		.references(() => players.playerId, { onDelete: "cascade" })
		.notNull(),
	playerLevel: integer().notNull(),
	coins: integer().notNull(),
	experiencePoints: integer().notNull(),
});
export type PlayerStats = typeof playerStats.$inferSelect;

export const unlockedLocations = pgTable("unlocked_locations", {
	playerId: serial()
		.references(() => players.playerId, { onDelete: "cascade" })
		.notNull(),
	locationId: serial()
		.notNull()
		.references(() => locations.locationId, { onDelete: "cascade" }),
});
export type UnlockedLocation = typeof unlockedLocations.$inferSelect;

export const completedLevels = pgTable("completed_levels", {
	playerId: serial()
		.references(() => players.playerId, { onDelete: "cascade" })
		.notNull(),
	locationId: serial()
		.notNull()
		.references(() => locations.locationId, { onDelete: "cascade" }),
	levelId: serial()
		.notNull()
		.references(() => locationLevels.levelId, { onDelete: "cascade" }),
	scoreObtained: integer().notNull(),
});
export type CompletedLevel = typeof completedLevels.$inferSelect;

export const itemLevels = pgTable("completed_levels", {
	playerId: serial()
		.references(() => players.playerId, { onDelete: "cascade" })
		.notNull(),
	locationId: serial()
		.notNull()
		.references(() => locations.locationId, { onDelete: "cascade" }),
	itemId: serial()
		.notNull()
		.references(() => items.itemId, { onDelete: "cascade" }),
	itemLevel: integer().notNull(),
});
export type ItemLevel = typeof itemLevels.$inferSelect;

export const completedEvents = pgTable("completed_levels", {
	playerId: serial()
		.references(() => players.playerId, { onDelete: "cascade" })
		.notNull(),
	eventId: serial()
		.notNull()
		.references(() => events.eventId, { onDelete: "cascade" }),
	scoreObtained: integer().notNull(),
});
export type CompletedEvents = typeof completedEvents.$inferSelect;

// GAME DATA
export const locations = pgTable("locations", {
	locationId: serial().primaryKey(),
	name: text().notNull(),
	description: text(),
	cost: integer().notNull(),
	unlocksAt: integer().notNull(),
	mapPosition: point().notNull(),
});
export type Location = typeof locations.$inferSelect;

export const locationLevels = pgTable("location_levels", {
	locationId: serial()
		.notNull()
		.references(() => locations.locationId, { onDelete: "cascade" }),
	levelId: serial().notNull(),
	levelNo: integer(),
	scoreRequired: integer().notNull(),
});
export type LocationLevel = typeof locationLevels.$inferSelect;

export const items = pgTable("items", {
	itemId: serial().primaryKey().notNull(),
	locationId: serial()
		.notNull()
		.references(() => locations.locationId, { onDelete: "cascade" }),
	gameItemId: text(),
	itemMaxLevel: integer().notNull().default(0),
});
export type Item = typeof items.$inferSelect;

export const events = pgTable("events", {
	eventId: serial().primaryKey().notNull(),
	locationId: serial()
		.notNull()
		.references(() => locations.locationId, { onDelete: "cascade" }),
	scoreRequired: integer().notNull(),
	rewardCoins: integer().notNull(),
});
export type Event = typeof events.$inferSelect;

export const notificationCriticalityLevel = pgEnum(
	"notification_criticality_level",
	["low", "medium", "high"],
);

export const notifications = pgTable("global_notifications", {
	notificationId: serial().primaryKey().notNull(),
	playerId: serial().references(() => players.playerId, {
		onDelete: "cascade",
	}), // if the notification is private
	text: text().notNull(),
	criticalityLevel: notificationCriticalityLevel().default("low"),
	expiresAt: timestamp("expires_at", {
		mode: "date",
		withTimezone: true,
	}).notNull(),
});
export type Notification = typeof notifications.$inferSelect;

// RELATIONS
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
