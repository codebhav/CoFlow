import { badges } from "../config/mongoCollections.js";
import { users } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";
import Validation from "../helpers.js";
import { ValidationError, NotFoundError } from "../utils/error-utils.js";

/**
 * Get all available badges
 * @returns {Array} Array of all badges
 */
export const getAllBadges = async () => {
	try {
		const badgeCollection = await badges();
		const badgeList = await badgeCollection.find({}).toArray();

		// Convert ObjectIds to strings
		badgeList.forEach((badge) => {
			if (badge._id) {
				badge._id = badge._id.toString();
			}
		});

		return badgeList;
	} catch (error) {
		console.error("Error getting all badges:", error);
		throw new Error(`Failed to get badges: ${error.message}`);
	}
};

/**
 * Get a badge by its ID
 * @param {string} badgeId - Badge ID
 * @returns {Object} Badge object
 */
export const getBadgeById = async (badgeId) => {
	try {
		badgeId = Validation.checkId(badgeId, "Badge ID");

		const badgeCollection = await badges();
		const badge = await badgeCollection.findOne({
			_id: new ObjectId(badgeId),
		});

		if (!badge) {
			throw new NotFoundError("Badge not found");
		}

		badge._id = badge._id.toString();
		return badge;
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError
		) {
			throw error;
		}
		console.error("Error getting badge by ID:", error);
		throw new Error(`Failed to get badge: ${error.message}`);
	}
};

/**
 * Create a new badge
 * @param {string} badgeId - Unique badge identifier (e.g., "newuser")
 * @param {string} name - Display name of the badge
 * @param {string} description - Description of how to earn the badge
 * @param {string} icon - Path to the badge icon
 * @param {Object} criteria - Rules for earning the badge
 * @returns {Object} Created badge
 */
export const createBadge = async (
	badgeId,
	name,
	description,
	icon,
	criteria
) => {
	try {
		// Validate inputs
		if (!badgeId || !name || !description || !icon || !criteria) {
			throw new ValidationError("All badge fields are required");
		}

		badgeId = Validation.checkString(badgeId, "Badge ID");
		name = Validation.checkString(name, "Badge name");
		description = Validation.checkString(description, "Badge description");
		icon = Validation.checkString(icon, "Badge icon");

		if (typeof criteria !== "object" || criteria === null) {
			throw new ValidationError("Criteria must be an object");
		}

		// Create badge object
		const newBadge = {
			_id: badgeId,
			name,
			description,
			icon,
			criteria,
		};

		// Check if badge already exists
		const badgeCollection = await badges();
		const existingBadge = await badgeCollection.findOne({ _id: badgeId });

		if (existingBadge) {
			throw new ValidationError("Badge ID already exists");
		}

		// Insert badge
		const insertInfo = await badgeCollection.insertOne(newBadge);

		if (!insertInfo.acknowledged) {
			throw new Error("Failed to create badge");
		}

		return newBadge;
	} catch (error) {
		if (error instanceof ValidationError) {
			throw error;
		}
		console.error("Error creating badge:", error);
		throw new Error(`Failed to create badge: ${error.message}`);
	}
};

/**
 * Get all badges for a user
 * @param {string} userId - User ID
 * @returns {Array} Array of badge objects
 */
export const getUserBadges = async (userId) => {
	try {
		userId = Validation.checkId(userId, "User ID");

		// Get user's badgeIds
		const userCollection = await users();
		const user = await userCollection.findOne({
			_id: new ObjectId(userId),
		});

		if (!user) {
			throw new NotFoundError("User not found");
		}

		// If user has no badges, return empty array
		if (
			!user.badgeIds ||
			!Array.isArray(user.badgeIds) ||
			user.badgeIds.length === 0
		) {
			return [];
		}

		// Get badge details for each badge ID
		const badgeCollection = await badges();
		const userBadges = await badgeCollection
			.find({ _id: { $in: user.badgeIds } })
			.toArray();

		// Convert ObjectIds to strings if needed
		userBadges.forEach((badge) => {
			if (badge._id && typeof badge._id !== "string") {
				badge._id = badge._id.toString();
			}
		});

		return userBadges;
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError
		) {
			throw error;
		}
		console.error("Error getting user badges:", error);
		throw new Error(`Failed to get user badges: ${error.message}`);
	}
};

/**
 * Award a badge to a user
 * @param {string} userId - User ID
 * @param {string} badgeId - Badge ID
 * @returns {Object} Result of the operation
 */
export const awardBadge = async (userId, badgeId) => {
	try {
		userId = Validation.checkId(userId, "User ID");
		badgeId = Validation.checkString(badgeId, "Badge ID");

		// Check if badge exists
		const badgeCollection = await badges();
		const badge = await badgeCollection.findOne({ _id: badgeId });

		if (!badge) {
			throw new NotFoundError("Badge not found");
		}

		// Check if user exists
		const userCollection = await users();
		const user = await userCollection.findOne({
			_id: new ObjectId(userId),
		});

		if (!user) {
			throw new NotFoundError("User not found");
		}

		// Check if user already has this badge
		const userBadges = user.badgeIds || [];
		if (userBadges.includes(badgeId)) {
			return {
				awarded: false,
				message: "User already has this badge",
			};
		}

		// Award badge to user
		const updateResult = await userCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{ $push: { badgeIds: badgeId } }
		);

		if (updateResult.modifiedCount === 0) {
			throw new Error("Failed to award badge to user");
		}

		return {
			awarded: true,
			badge,
			message: `Badge "${badge.name}" awarded successfully`,
		};
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError
		) {
			throw error;
		}
		console.error("Error awarding badge:", error);
		throw new Error(`Failed to award badge: ${error.message}`);
	}
};

/**
 * Check and award badges based on user activity
 * @param {Object} user - User object
 * @param {string} activityType - Type of activity (e.g., "login", "groupJoin", "rating")
 * @returns {Array} Array of awarded badges (if any)
 */
export const checkAndAwardBadges = async (user, activityType) => {
	try {
		if (!user || !user._id) {
			throw new ValidationError("Valid user object is required");
		}

		if (!activityType) {
			throw new ValidationError("Activity type is required");
		}

		const userId = user._id.toString();
		const awardedBadges = [];

		// Get all badges
		const badgeCollection = await badges();
		const allBadges = await badgeCollection.find({}).toArray();

		// Filter badges that match the activity type
		const relevantBadges = allBadges.filter(
			(badge) => badge.criteria && badge.criteria.type === activityType
		);

		// Check each badge criteria
		for (const badge of relevantBadges) {
			// Skip if user already has this badge
			if (user.badgeIds && user.badgeIds.includes(badge._id)) {
				continue;
			}

			let badgeEarned = false;

			// Check criteria based on activity type
			switch (activityType) {
				case "account_creation":
					// Award badge for new users
					badgeEarned = true;
					break;

				case "login":
					// Check login count threshold
					const loginCount = user.loginCount || 0;
					badgeEarned = loginCount >= badge.criteria.threshold;
					break;

				case "groupJoin":
					// Check group join count threshold
					const groupJoinCount = user.groupJoinCount || 0;
					badgeEarned = groupJoinCount >= badge.criteria.threshold;
					break;

				case "rating":
					// Check rating count threshold
					const ratingCount = user.ratingCount || 0;
					badgeEarned = ratingCount >= badge.criteria.threshold;
					break;

				// Add more activity types as needed
			}

			// Award badge if earned
			if (badgeEarned) {
				const awardResult = await awardBadge(userId, badge._id);
				if (awardResult.awarded) {
					awardedBadges.push(badge);
				}
			}
		}

		return awardedBadges;
	} catch (error) {
		console.error("Error checking and awarding badges:", error);
		// Don't throw here to prevent breaking the main function
		return [];
	}
};

/**
 * Initialize default badges
 * This should be called during application startup or seeding
 */
export const initializeDefaultBadges = async () => {
	try {
		const defaultBadges = [
			{
				_id: "newuser",
				name: "New Explorer",
				description:
					"Awarded to users who have successfully created an account",
				icon: "/public/images/badges/new-explorer.svg",
				criteria: {
					type: "account_creation",
					threshold: 1,
				},
			},
			{
				_id: "active-learner",
				name: "Active Learner",
				description: "For users who have logged in at least 10 times",
				icon: "/public/images/badges/active-learner.svg",
				criteria: {
					type: "login",
					threshold: 10,
				},
			},
			{
				_id: "helper10",
				name: "Helpful Hand",
				description:
					"For users who have joined at least 10 study groups",
				icon: "/public/images/badges/helpful-hand.svg",
				criteria: {
					type: "groupJoin",
					threshold: 10,
				},
			},
			{
				_id: "social-king",
				name: "Social King",
				description: "For users who have rated at least 15 other users",
				icon: "/public/images/badges/social-king.svg",
				criteria: {
					type: "rating",
					threshold: 15,
				},
			},
		];

		const badgeCollection = await badges();

		// Check if we already have badges
		const existingBadges = await badgeCollection.countDocuments();
		if (existingBadges > 0) {
			console.log("Badges already initialized, skipping...");
			return;
		}

		// Create each default badge
		for (const badge of defaultBadges) {
			try {
				await badgeCollection.insertOne(badge);
				console.log(`Created badge: ${badge.name}`);
			} catch (err) {
				console.error(`Error creating badge ${badge.name}:`, err);
			}
		}

		console.log("Default badges initialized successfully");
	} catch (error) {
		console.error("Error initializing default badges:", error);
	}
};

export default {
	getAllBadges,
	getBadgeById,
	createBadge,
	getUserBadges,
	awardBadge,
	checkAndAwardBadges,
	initializeDefaultBadges,
};
