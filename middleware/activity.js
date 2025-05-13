import BadgeService from "../services/badgeService.js";
import { findUserById } from "../data/user.js";

// Track login activity (for Active User badge)
export const trackLogin = async (req, res, next) => {
	try {
		if (!req.session || !req.session.user) {
			return next();
		}

		const user = await findUserById(req.session.user.id);
		if (!user) return next();

		// Update login count
		user.loginCount = (user.loginCount || 0) + 1;

		// Check for badges
		await BadgeService.checkAndAwardBadges(user, "login");
		next();
	} catch (error) {
		console.error("Error tracking login:", error);
		next(); // Continue despite error
	}
};

// Track group joining (for Group Joiner badge)
export const trackGroupJoin = async (req, res, next) => {
	try {
		if (!req.session || !req.session.user) {
			return next();
		}

		const user = await findUserById(req.session.user.id);
		if (!user) return next();

		// Update group join count
		user.groupJoinCount = (user.groupJoinCount || 0) + 1;

		// Check for badges
		await BadgeService.checkAndAwardBadges(user, "group_join");
		next();
	} catch (error) {
		console.error("Error tracking group join:", error);
		next(); // Continue despite error
	}
};

// Track rating activity (for 5-Star badge)
export const trackRating = async (req, res, next) => {
	try {
		if (!req.session || !req.session.user) {
			return next();
		}

		const user = await findUserById(req.session.user.id);
		if (!user) return next();

		// Update rating count
		user.ratingCount = (user.ratingCount || 0) + 1;

		// Check for badges
		await BadgeService.checkAndAwardBadges(user, "rating");
		next();
	} catch (error) {
		console.error("Error tracking rating:", error);
		next(); // Continue despite error
	}
};

export default { trackLogin, trackGroupJoin, trackRating };
