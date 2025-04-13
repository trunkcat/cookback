export const MANAGER_ROLE = ["manager", "supermanager"] as const;

export const PLACE_TYPE = ["restaurant"] as const;

export const GOAL_TYPE = ["coins", "tip", "xp", "customers"] as const;

export type Player = {
	playerId: string;
	username: string;
	email: string;
	passwordHash: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PlayerInsert = {
	username: string;
	email: string;
	passwordHash: string;
	playerId?: string | undefined;
	createdAt?: Date | undefined;
	updatedAt?: Date | undefined;
};

export type PlayerSession = {
	playerId: string;
	createdAt: Date;
	updatedAt: Date;
	playerSessionId: string;
	expiresAt: Date;
};

export type PlayerSessionInsert = {
	playerId: string;
	playerSessionId: string;
	expiresAt: Date;
	createdAt?: Date | undefined;
	updatedAt?: Date | undefined;
};

export type PlayerStats = {
	playerId: string;
	createdAt: Date;
	updatedAt: Date;
	playerLevel: number;
	coins: number;
	experiencePoints: number;
};

export type PlayerStatsInsert = {
	playerId: string;
	playerLevel: number;
	coins: number;
	experiencePoints: number;
	createdAt?: Date | undefined;
	updatedAt?: Date | undefined;
};

export type ManagerRole = "manager" | "supermanager";

export type Manager = {
	username: string;
	email: string;
	passwordHash: string;
	createdAt: Date;
	updatedAt: Date;
	managerId: string;
	role: "manager" | "supermanager";
};

export type ManagerInsert = {
	username: string;
	email: string;
	passwordHash: string;
	role: "manager" | "supermanager";
	createdAt?: Date | undefined;
	updatedAt?: Date | undefined;
	managerId?: string | undefined;
};

export type ManagerSession = {
	createdAt: Date;
	updatedAt: Date;
	expiresAt: Date;
	managerId: string;
	managerSessionId: string;
};

export type ManagerSessionInsert = {
	expiresAt: Date;
	managerId: string;
	managerSessionId: string;
	createdAt?: Date | undefined;
	updatedAt?: Date | undefined;
};

export type PlaceType = "restaurant";

export type Place = {
	name: string;
	createdAt: Date;
	updatedAt: Date;
	placeId: number;
	type: "restaurant";
	unlocksAt: number;
	price: number;
	position: [number, number];
	description: string;
};

export type PlaceInsert = {
	name: string;
	type: "restaurant";
	unlocksAt: number;
	price: number;
	position: [number, number];
	description: string;
	createdAt?: Date | undefined;
	updatedAt?: Date | undefined;
};

export type UnlockedPlace = {
	playerId: string;
	createdAt: Date;
	updatedAt: Date;
	placeId: number;
};

export type UnlockedPlaceInsert = {
	playerId: string;
	placeId: number;
	createdAt?: Date | undefined;
	updatedAt?: Date | undefined;
};

export type PlaceLevel = {
	createdAt: Date;
	updatedAt: Date;
	placeId: number;
	levelId: number;
	levelNo: number;
};

export type PlaceLevelInsert = {
	placeId: number;
	levelNo: number;
	createdAt?: Date | undefined;
	updatedAt?: Date | undefined;
};

export type GoalType = "coins" | "tip" | "xp" | "customers";

export type PlaceLevelGoal = {
	createdAt: Date;
	updatedAt: Date;
	levelId: number;
	goalId: number;
	goalType: "coins" | "tip" | "xp" | "customers";
	goalValue: number;
};

export type PlaceLevelGoalInsert = {
	levelId: number;
	goalType: "coins" | "tip" | "xp" | "customers";
	goalValue: number;
	createdAt?: Date | undefined;
	updatedAt?: Date | undefined;
};

export type PlaceLevelGoalProgress = {
	playerId: string;
	createdAt: Date;
	updatedAt: Date;
	goalId: number;
	obtainedValue: number;
};

export type PlaceLevelGoalProgressInsert = {
	playerId: string;
	goalId: number;
	obtainedValue: number;
	createdAt?: Date | undefined;
	updatedAt?: Date | undefined;
};

export type PlaceItem = {
	createdAt: Date;
	updatedAt: Date;
	placeId: number;
	itemId: number;
	gameItem: string;
	unlocksIn: number;
	maxLevel: number;
};

export type PlaceItemInsert = {
	placeId: number;
	gameItem: string;
	unlocksIn: number;
	maxLevel: number;
	createdAt?: Date | undefined;
	updatedAt?: Date | undefined;
};

export type PlaceItemUpgrade = {
	playerId: string;
	createdAt: Date;
	updatedAt: Date;
	itemId: number;
	level: number;
};

export type PlaceItemUpgradeInsert = {
	playerId: string;
	itemId: number;
	level: number;
	createdAt?: Date | undefined;
	updatedAt?: Date | undefined;
};
