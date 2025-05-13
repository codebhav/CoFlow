import { Router } from "express";
const router = Router();
import * as badgeData from "../data/badge.js";
import * as userdata from "../data/user.js";
import middleware from "../middleware.js";
import { ValidationError, NotFoundError } from "../utils/error-utils.js";
import { asyncHandler } from "../utils/error-utils.js";

/**
 * GET /badges - Get all badges
 */
router.get(
	"/",
	middleware.authenticationMiddleware,
	asyncHandler(async (req, res) => {
		try {
			const badges = await badgeData.getAllBadges();

			return res.render("badges", {
				title: "Badges",
				badges,
				user: req.session.user,
			});
		} catch (error) {
			console.error("Error getting badges:", error);
			return res.status(500).render("error", {
				title: "Error",
				message: "Failed to load badges",
			});
		}
	})
);

/**
 * GET /badges/user/:id - Get badges for a user
 */
router.get(
	"/user/:id",
	middleware.authenticationMiddleware,
	asyncHandler(async (req, res) => {
		try {
			const userId = req.params.id;

			// Get user data
			const user = await userdata.findUserById(userId);
			if (!user) {
				throw new NotFoundError("User not found");
			}

			// Get user badges
			const userBadges = await badgeData.getUserBadges(userId);

			return res.render("user-badges", {
				title: `${user.userName}'s Badges`,
				user: user,
				badges: userBadges,
				currentUser: req.session.user,
			});
		} catch (error) {
			console.error("Error getting user badges:", error);

			if (error instanceof NotFoundError) {
				return res.status(404).render("error", {
					title: "User Not Found",
					message: "The requested user does not exist",
				});
			}

			return res.status(500).render("error", {
				title: "Error",
				message: "Failed to load user badges",
			});
		}
	})
);

/**
 * GET /badges/my - Get current user's badges
 */
router.get(
	"/my",
	middleware.authenticationMiddleware,
	asyncHandler(async (req, res) => {
		try {
			const userId = req.session.user.id;

			// Get user badges
			const userBadges = await badgeData.getUserBadges(userId);

			return res.render("my-badges", {
				title: "My Badges",
				badges: userBadges,
				user: req.session.user,
			});
		} catch (error) {
			console.error("Error getting user badges:", error);
			return res.status(500).render("error", {
				title: "Error",
				message: "Failed to load your badges",
			});
		}
	})
);

export default router;
