import * as badgeData from "../data/badge.js";

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
			if (!user || !activityType) {
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
			return await badgeData.awardBadge(userId, badgeId);
		} catch (error) {
			console.error("Error awarding badge:", error);
			return { awarded: false, message: error.message };
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
	 * Initialize default badges
	 * @returns {Promise<void>}
	 */
	static async initializeDefaultBadges() {
		try {
			await badgeData.initializeDefaultBadges();
		} catch (error) {
			console.error("Error initializing default badges:", error);
		}
	}
}

export default BadgeService;
