export const SECOND = 1 * 1000,
	MINUTE = 60 * SECOND,
	HOUR = 60 * MINUTE,
	DAY = 24 * HOUR;

// Expires the stored session, invalidating the login
export const SESSION_EXPIRATION_PERIOD = 30 * DAY;

// Renews the stored session, once it reaches this time period since the last renewal
export const SESSION_RENEW_PERIOD = 15 * DAY;
