import BadgeService from "../services/badgeService.js";
import { findUserById } from "../data/user.js";
import { users } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";

// Track login activity (for Active User badge)
export const trackLogin = async (req, res, next) => {
	try {
		if (!req.session || !req.session.user) {
			return next();
		}

		const userId = req.session.user.id;
		const user = await findUserById(userId);
		if (!user) return next();

		// Update login count
		const loginCount = (user.loginCount || 0) + 1;

		// Update user in database
		const userCollection = await users();
		await userCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{ $set: { loginCount: loginCount } }
		);

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

		const userId = req.session.user.id;
		const user = await findUserById(userId);
		if (!user) return next();

		// Update group join count
		const groupJoinCount = (user.groupJoinCount || 0) + 1;

		// Update user in database
		const userCollection = await users();
		await userCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{ $set: { groupJoinCount: groupJoinCount } }
		);

		// Check for badges
		await BadgeService.checkAndAwardBadges(user, "groupJoin");
		next();
	} catch (error) {
		console.error("Error tracking group join:", error);
		next(); // Continue despite error
	}
};

// Track rating activity (for Social King badge)
export const trackRating = async (req, res, next) => {
	try {
		if (!req.session || !req.session.user) {
			return next();
		}

		const userId = req.session.user.id;
		const user = await findUserById(userId);
		if (!user) return next();

		// Update rating count
		const ratingCount = (user.ratingCount || 0) + 1;

		// Update user in database
		const userCollection = await users();
		await userCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{ $set: { ratingCount: ratingCount } }
		);

		// Check for badges
		await BadgeService.checkAndAwardBadges(user, "rating");
		next();
	} catch (error) {
		console.error("Error tracking rating:", error);
		next(); // Continue despite error
	}
};

export default { trackLogin, trackGroupJoin, trackRating };
