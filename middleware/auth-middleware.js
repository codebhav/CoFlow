import {
	ValidationError,
	AuthenticationError,
	AuthorizationError,
} from "../utils/error-utils.js";

/**
 * Middleware to ensure user is authenticated
 */
export const ensureAuthenticated = (req, res, next) => {
	if (!req.session || !req.session.user) {
		// Save the requested URL to redirect back after login
		req.session.returnTo = req.originalUrl;
		return res.redirect("/auth/login");
	}
	next();
};

/**
 * Middleware to ensure user is NOT authenticated (for login/signup pages)
 */
export const ensureNotAuthenticated = (req, res, next) => {
	if (req.session && req.session.user) {
		// Redirect based on role
		switch (req.session.user.role) {
			case "admin":
				return res.redirect("/admin/admin-table");
			case "business":
				return res.redirect("/profile/business");
			case "user":
			default:
				return res.redirect("/profile");
		}
	}
	next();
};

/**
 * Middleware to ensure user has admin role
 */
export const ensureAdmin = (req, res, next) => {
	if (!req.session || !req.session.user) {
		req.session.returnTo = req.originalUrl;
		return res.redirect("/auth/login");
	}

	if (req.session.user.role !== "admin") {
		return res.status(403).render("error", {
			title: "Access Denied",
			message: "You do not have permission to access this page",
		});
	}

	next();
};

/**
 * Middleware to ensure user has user role
 */
export const ensureUser = (req, res, next) => {
	if (!req.session || !req.session.user) {
		req.session.returnTo = req.originalUrl;
		return res.redirect("/auth/login");
	}

	if (req.session.user.role !== "user") {
		return res.status(403).render("error", {
			title: "Access Denied",
			message: "You do not have permission to access this page",
		});
	}

	next();
};

/**
 * Middleware to ensure user has business role
 */
export const ensureBusiness = (req, res, next) => {
	if (!req.session || !req.session.user) {
		req.session.returnTo = req.originalUrl;
		return res.redirect("/auth/login");
	}

	if (req.session.user.role !== "business") {
		return res.status(403).render("error", {
			title: "Access Denied",
			message: "You do not have permission to access this page",
		});
	}

	next();
};

/**
 * Middleware to check if user is group admin
 * This will be used for group management routes
 */
export const ensureGroupAdmin = (groupData) => {
	return async (req, res, next) => {
		try {
			if (!req.session || !req.session.user) {
				req.session.returnTo = req.originalUrl;
				return res.redirect("/auth/login");
			}

			const groupId = req.params.id || req.body.groupId;
			if (!groupId) {
				throw new ValidationError("Group ID is required");
			}

			const group = await groupData.getGroupById(groupId);
			if (!group) {
				throw new ValidationError("Group not found");
			}

			// Check if user is the admin of the group
			if (group.members[0] !== req.session.user.id) {
				throw new AuthorizationError(
					"You are not the admin of this group"
				);
			}

			// Add group to request for use in route handlers
			req.group = group;
			next();
		} catch (error) {
			if (
				error instanceof ValidationError ||
				error instanceof AuthorizationError
			) {
				return res.status(403).render("error", {
					title: "Access Denied",
					message: error.message,
				});
			}

			return res.status(500).render("error", {
				title: "Error",
				message: "An unexpected error occurred",
			});
		}
	};
};

/**
 * Middleware to log authentication status
 */
export const logAuthStatus = (req, res, next) => {
	const isAuthenticated = req.session && req.session.user;
	const role = isAuthenticated ? req.session.user.role : "guest";
	const username = isAuthenticated ? req.session.user.userName : "anonymous";

	console.log(
		`[AUTH] ${req.method} ${req.path} - User: ${username}, Role: ${role}`
	);
	next();
};

export default {
	ensureAuthenticated,
	ensureNotAuthenticated,
	ensureAdmin,
	ensureUser,
	ensureBusiness,
	ensureGroupAdmin,
	logAuthStatus,
};
