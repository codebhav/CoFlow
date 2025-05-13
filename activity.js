const BadgeService = require("../services/badgeService");
const User = require("../models/User");

const trackLogin = async (req, res, next) => {
	try {
		const user = await User.findById(req.session.user.id);
		if (!user) return next();

		user.loginCount = (user.loginCount || 0) + 1;
		await user.save();

		await BadgeService.checkAndAwardBadges(user, "login");
		next();
	} catch (error) {
		next(error);
	}
};

const trackGroupJoin = async (req, res, next) => {
	try {
		const user = await User.findById(req.session.user.id);
		if (!user) return next();

		user.groupJoinCount = (user.groupJoinCount || 0) + 1;
		await user.save();

		await BadgeService.checkAndAwardBadges(user, "groupJoin");
		next();
	} catch (error) {
		next(error);
	}
};

const trackRating = async (req, res, next) => {
	try {
		const user = await User.findById(req.session.user.id);
		if (!user) return next();

		user.ratingCount = (user.ratingCount || 0) + 1;
		await user.save();

		await BadgeService.checkAndAwardBadges(user, "rating");
		next();
	} catch (error) {
		next(error);
	}
};

module.exports = { trackLogin, trackGroupJoin, trackRating };
