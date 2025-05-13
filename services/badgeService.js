import * as badgeData from "../data/badge.js";
import * as userData from "../data/user.js";
import { ValidationError } from "../utils/error-utils.js";

/**
 * Service for badge-related operations
 */
class BadgeService {
	/**
	 * Check if a user has earned any badges based on their activity
	 * @param {Object} user - User object
	 * @param {string} activityType - Type of activity performed
	 * @returns {Promise<Array>} - Array of badges awarded
	 */
	static async checkAndAwardBadges(user, activityType) {
		try {
			if (!user || !user._id || !activityType) {
				console.log("Invalid user or activity type");
				return [];
			}

			// Process activity to check for badge qualification
			return await badgeData.checkAndAwardBadges(user, activityType);
		} catch (error) {
			console.error("Error in badge service:", error);
			return [];
		}
	}

	/**
	 * Get all badges for a user
	 * @param {string} userId - User ID
	 * @returns {Promise<Array>} - Array of badge objects
	 */
	static async getUserBadges(userId) {
		try {
			if (!userId) {
				console.log("User ID is required");
				return [];
			}

			return await badgeData.getUserBadges(userId);
		} catch (error) {
			console.error("Error getting user badges:", error);
			return [];
		}
	}

	/**
	 * Award a specific badge to a user
	 * @param {string} userId - User ID
	 * @param {string} badgeId - Badge ID
	 * @returns {Promise<Object>} - Result object
	 */
	static async awardBadge(userId, badgeId) {
		try {
			if (!userId || !badgeId) {
				throw new ValidationError("User ID and Badge ID are required");
			}

			return await badgeData.awardBadge(userId, badgeId);
		} catch (error) {
			console.error("Error awarding badge:", error);
			return { awarded: false, message: error.message };
		}
	}

	/**
	 * Award New Explorer badge to a new user
	 * @param {string} userId - User ID to award badge to
	 * @returns {Promise<Object>} Result of badge award
	 */
	static async awardNewUserBadge(userId) {
		try {
			if (!userId) {
				throw new ValidationError("User ID is required");
			}

			// Award the "newuser" badge
			return await badgeData.awardBadge(userId, "newuser");
		} catch (error) {
			console.error("Error awarding new user badge:", error);
			return {
				awarded: false,
				message: `Failed to award new user badge: ${error.message}`,
			};
		}
	}

	/**
	 * Get all available badges
	 * @returns {Promise<Array>} - Array of all badge objects
	 */
	static async getAllBadges() {
		try {
			return await badgeData.getAllBadges();
		} catch (error) {
			console.error("Error getting all badges:", error);
			return [];
		}
	}

	/**
	 * Initialize default badges in the database
	 * @returns {Promise<void>}
	 */
	static async initializeDefaultBadges() {
		try {
			console.log("Initializing default badges...");
			await badgeData.initializeDefaultBadges();
			console.log("Default badges initialized successfully");
		} catch (error) {
			console.error("Error initializing default badges:", error);
			// Don't throw to avoid crashing the application startup
		}
	}
}

export default BadgeService;
