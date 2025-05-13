import { badges, userBadges } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";
import { ValidationError, NotFoundError } from "../utils/error-utils.js";
import Validation from "../helpers.js";

/**
 * Create a new badge
 * @param {string} id - Unique identifier for the badge
 * @param {string} name - Display name of the badge
 * @param {string} description - Description of how to earn the badge
 * @param {string} icon - Path to the badge icon
 * @param {Object} criteria - Rules for earning the badge
 * @returns {Object} Created badge
 */
export const createBadge = async (id, name, description, icon, criteria) => {
	try {
		// Validate inputs
		id = Validation.checkString(id, "Badge ID");
		name = Validation.checkString(name, "Badge name");
		description = Validation.checkString(description, "Badge description");
		icon = Validation.checkString(icon, "Badge icon");

		if (!criteria || typeof criteria !== "object") {
			throw new ValidationError("Criteria must be an object");
		}

		if (!criteria.type || !criteria.threshold) {
			throw new ValidationError(
				"Criteria must include type and threshold"
			);
		}

		// Check if badge with ID already exists
		const badgeCollection = await badges();
		const existingBadge = await badgeCollection.findOne({ _id: id });

		if (existingBadge) {
			throw new ValidationError(`Badge with ID ${id} already exists`);
		}

		// Create new badge
		const newBadge = {
			_id: id,
			name,
			description,
			icon,
			criteria,
			createdAt: new Date().toISOString(),
		};

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
 * Get all badges
 * @returns {Array} Array of all badges
 */
export const getAllBadges = async () => {
	try {
		const badgeCollection = await badges();
		const allBadges = await badgeCollection.find({}).toArray();
		return allBadges;
	} catch (error) {
		console.error("Error getting all badges:", error);
		throw new Error(`Failed to get badges: ${error.message}`);
	}
};

/**
 * Get a badge by ID
 * @param {string} badgeId - Badge ID
 * @returns {Object} Badge object
 */
export const getBadgeById = async (badgeId) => {
	try {
		badgeId = Validation.checkString(badgeId, "Badge ID");
		const badgeCollection = await badges();
		const badge = await badgeCollection.findOne({ _id: badgeId });

		if (!badge) {
			throw new NotFoundError("Badge not found");
		}

		return badge;
	} catch (error) {
		if (error instanceof NotFoundError) {
			throw error;
		}
		console.error("Error getting badge by ID:", error);
		throw new Error(`Failed to get badge: ${error.message}`);
	}
};

/**
 * Award a badge to a user
 * @param {string} userId - User ID
 * @param {string} badgeId - Badge ID
 * @returns {Object} UserBadge object
 */
export const awardBadgeToUser = async (userId, badgeId) => {
	try {
		userId = Validation.checkId(userId, "User ID");
		badgeId = Validation.checkString(badgeId, "Badge ID");

		// Check if badge exists
		const badge = await getBadgeById(badgeId);
		if (!badge) {
			throw new NotFoundError("Badge not found");
		}

		// Check if user already has this badge
		const userBadgeCollection = await userBadges();
		const existingUserBadge = await userBadgeCollection.findOne({
			userId,
			badgeId,
		});

		if (existingUserBadge) {
			throw new ValidationError("User already has this badge");
		}

		// Create new user badge
		const newUserBadge = {
			_id: new ObjectId(),
			userId,
			badgeId,
			earnedAt: new Date().toISOString(),
		};

		const insertInfo = await userBadgeCollection.insertOne(newUserBadge);
		if (!insertInfo.acknowledged) {
			throw new Error("Failed to award badge to user");
		}

		newUserBadge._id = newUserBadge._id.toString();
		return newUserBadge;
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError
		) {
			throw error;
		}
		console.error("Error awarding badge to user:", error);
		throw new Error(`Failed to award badge: ${error.message}`);
	}
};

/**
 * Get all badges for a user
 * @param {string} userId - User ID
 * @returns {Array} Array of user's badges with details
 */
export const getUserBadges = async (userId) => {
	try {
		userId = Validation.checkId(userId, "User ID");

		const userBadgeCollection = await userBadges();
		const badgeCollection = await badges();

		// Get all user badge records
		const userBadgeRecords = await userBadgeCollection
			.find({
				userId,
			})
			.toArray();

		// Get badge details for each badge
		const userBadgesWithDetails = await Promise.all(
			userBadgeRecords.map(async (record) => {
				const badge = await badgeCollection.findOne({
					_id: record.badgeId,
				});
				if (!badge) return null;

				return {
					_id: record._id.toString(),
					badgeId: record.badgeId,
					name: badge.name,
					description: badge.description,
					icon: badge.icon,
					earnedAt: record.earnedAt,
				};
			})
		);

		// Filter out any null entries (in case a badge was deleted)
		return userBadgesWithDetails.filter((badge) => badge !== null);
	} catch (error) {
		console.error("Error getting user badges:", error);
		throw new Error(`Failed to get user badges: ${error.message}`);
	}
};

/**
 * Check if a user has a specific badge
 * @param {string} userId - User ID
 * @param {string} badgeId - Badge ID
 * @returns {boolean} True if user has the badge
 */
export const userHasBadge = async (userId, badgeId) => {
	try {
		userId = Validation.checkId(userId, "User ID");
		badgeId = Validation.checkString(badgeId, "Badge ID");

		const userBadgeCollection = await userBadges();
		const userBadge = await userBadgeCollection.findOne({
			userId,
			badgeId,
		});

		return userBadge !== null;
	} catch (error) {
		console.error("Error checking if user has badge:", error);
		throw new Error(`Failed to check if user has badge: ${error.message}`);
	}
};

export default {
	createBadge,
	getAllBadges,
	getBadgeById,
	awardBadgeToUser,
	getUserBadges,
	userHasBadge,
};
