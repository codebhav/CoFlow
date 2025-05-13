import * as badgeData from "../data/badge.js";
import * as userData from "../data/user.js";

/**
 * Badge criteria types
 */
const BADGE_CRITERIA = {
	ACCOUNT_CREATION: "account_creation", // For "New Explorer" badge
	LOGIN_COUNT: "login_count", // For "Active User" badge
	GROUP_JOIN: "group_join", // For "Group Joiner" badge
	GROUP_CREATE: "group_create", // For "Group Creator" badge
	RATING: "rating", // For "5-Star" badge
};

/**
 * Map of badge IDs to their criteria
 */
const BADGE_DEFINITIONS = {
	newuser: {
		name: "New Explorer",
		description:
			"Awarded to users who have successfully created an account",
		icon: "/public/images/badges/new-explorer.svg",
		criteria: {
			type: BADGE_CRITERIA.ACCOUNT_CREATION,
			threshold: 1,
		},
	},
	"active-user": {
		name: "Active User",
		description: "Awarded to users who have logged in 10 times",
		icon: "/public/images/badges/active-user.svg",
		criteria: {
			type: BADGE_CRITERIA.LOGIN_COUNT,
			threshold: 10,
		},
	},
	"group-joiner": {
		name: "Group Joiner",
		description: "Awarded to users who have joined 5 study groups",
		icon: "/public/images/badges/group-joiner.svg",
		criteria: {
			type: BADGE_CRITERIA.GROUP_JOIN,
			threshold: 5,
		},
	},
	"group-creator": {
		name: "Group Creator",
		description: "Awarded to users who have created 3 study groups",
		icon: "/public/images/badges/group-creator.svg",
		criteria: {
			type: BADGE_CRITERIA.GROUP_CREATE,
			threshold: 3,
		},
	},
	"five-star": {
		name: "5-Star Student",
		description: "Awarded to users who have received a 5-star rating",
		icon: "/public/images/badges/five-star.svg",
		criteria: {
			type: BADGE_CRITERIA.RATING,
			threshold: 5,
		},
	},
};

/**
 * Initialize all badges in the database if they don't exist
 */
export const initializeBadges = async () => {
	try {
		const allBadges = await badgeData.getAllBadges();
		const badgeIds = Object.keys(BADGE_DEFINITIONS);

		// Create any missing badges
		for (const badgeId of badgeIds) {
			const existingBadge = allBadges.find(
				(badge) => badge._id === badgeId
			);
			if (!existingBadge) {
				const badgeDef = BADGE_DEFINITIONS[badgeId];
				await badgeData.createBadge(
					badgeId,
					badgeDef.name,
					badgeDef.description,
					badgeDef.icon,
					badgeDef.criteria
				);
				console.log(`Created badge: ${badgeId}`);
			}
		}

		console.log("Badge initialization complete");
	} catch (error) {
		console.error("Error initializing badges:", error);
	}
};

/**
 * Award badges to a user based on their actions
 * @param {Object} user - User object
 * @param {string} actionType - Type of action (login, group_join, etc.)
 */
export const checkAndAwardBadges = async (user, actionType) => {
	try {
		if (!user || !user._id) {
			console.error("Invalid user provided to badge check");
			return;
		}

		// Get all existing user badges
		const userBadges = await badgeData.getUserBadges(user._id);
		const userBadgeIds = userBadges.map((badge) => badge.badgeId);

		// Get all badges from definitions
		const badgeIds = Object.keys(BADGE_DEFINITIONS);

		// Check each badge to see if it should be awarded
		for (const badgeId of badgeIds) {
			// Skip if user already has this badge
			if (userBadgeIds.includes(badgeId)) {
				continue;
			}

			const badgeDef = BADGE_DEFINITIONS[badgeId];
			const criteria = badgeDef.criteria;

			// Check if badge should be awarded based on action type and user data
			let shouldAward = false;

			switch (criteria.type) {
				case BADGE_CRITERIA.ACCOUNT_CREATION:
					// Award immediately for new users
					shouldAward = actionType === "account_creation";
					break;

				case BADGE_CRITERIA.LOGIN_COUNT:
					// Award if login count meets or exceeds threshold
					shouldAward =
						actionType === "login" &&
						user.loginCount >= criteria.threshold;
					break;

				case BADGE_CRITERIA.GROUP_JOIN:
					// Award if group join count meets or exceeds threshold
					shouldAward =
						actionType === "group_join" &&
						(user.joinedGroups?.length || 0) >= criteria.threshold;
					break;

				case BADGE_CRITERIA.GROUP_CREATE:
					// Award if group creation count meets or exceeds threshold
					shouldAward =
						actionType === "group_create" &&
						(user.createdGroups?.length || 0) >= criteria.threshold;
					break;

				case BADGE_CRITERIA.RATING:
					// Award if rating meets or exceeds threshold
					shouldAward =
						actionType === "rating" &&
						user.rating >= criteria.threshold;
					break;
			}

			// Award badge if criteria met
			if (shouldAward) {
				try {
					await badgeData.awardBadgeToUser(user._id, badgeId);
					console.log(`Awarded badge ${badgeId} to user ${user._id}`);

					// Add badge ID to user's badgeIds array
					await userData.addBadgeToUser(user._id, badgeId);
				} catch (error) {
					console.error(
						`Error awarding badge ${badgeId} to user:`,
						error
					);
				}
			}
		}
	} catch (error) {
		console.error("Error checking and awarding badges:", error);
	}
};

/**
 * Award the "New Explorer" badge to a new user
 * @param {string} userId - User ID
 */
export const awardNewUserBadge = async (userId) => {
	try {
		const user = await userData.findUserById(userId);
		if (!user) return;

		await checkAndAwardBadges(user, "account_creation");
	} catch (error) {
		console.error("Error awarding new user badge:", error);
	}
};

export default {
	initializeBadges,
	checkAndAwardBadges,
	awardNewUserBadge,
	BADGE_CRITERIA,
};
