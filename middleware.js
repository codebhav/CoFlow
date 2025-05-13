/**
 * Middleware functions for the CoFlow application
 */

/**
 * Logs request details including authentication status
 */
const loggingMiddleware = (req, res, next) => {
	const timestamp = new Date().toUTCString();
	const method = req.method;
	const path = req.path;

	// Check authentication status
	const isAuthenticated = req.session && req.session.user;
	let authStatus = "Non-Authenticated";

	if (isAuthenticated) {
		authStatus =
			req.session.user.role === "admin"
				? "Authenticated Admin"
				: `Authenticated ${
						req.session.user.role.charAt(0).toUpperCase() +
						req.session.user.role.slice(1)
				  }`;
	}

	console.log(`[${timestamp}]: ${method} ${path} (${authStatus})`);

	next();
};

/**
 * Redirects authenticated users from login page based on their role
 */
const loginRouteMiddleware = (req, res, next) => {
	if (req.session && req.session.user) {
		// Route to appropriate dashboard based on role
		switch (req.session.user.role) {
			case "admin":
				return res.redirect("/admin/admin-table");
			case "business":
				return res.redirect("/profile/business");
			case "user":
				return res.redirect("/profile");
			default:
				return res.redirect("/");
		}
	}
	next();
};

/**
 * Redirects authenticated users from signup page based on their role
 */
const signupRouteMiddleware = (req, res, next) => {
	if (req.session && req.session.user) {
		// Route to appropriate dashboard based on role
		switch (req.session.user.role) {
			case "admin":
				return res.redirect("/admin/admin-table");
			case "business":
				return res.redirect("/profile/business");
			case "user":
				return res.redirect("/profile");
			default:
				return res.redirect("/");
		}
	}
	next();
};

/**
 * Ensures only admin users can access admin routes
 */
const adminRouteMiddleware = (req, res, next) => {
	if (!req.session || !req.session.user) {
		return res.redirect("/auth/login");
	}

	if (req.session.user.role !== "admin") {
		return res.status(403).render("error", {
			title: "Access Denied",
			message: "You do not have permission to view this page.",
		});
	}

	next();
};

/**
 * Ensures only regular users can access user-specific routes
 */
const userRouteMiddleware = (req, res, next) => {
	if (!req.session || !req.session.user) {
		return res.redirect("/auth/login");
	}

	if (req.session.user.role !== "user") {
		return res.status(403).render("error", {
			title: "Access Denied",
			message: "You do not have permission to view this page.",
		});
	}

	next();
};

/**
 * Ensures only business users can access business-specific routes
 */
const businessRouteMiddleware = (req, res, next) => {
	if (!req.session || !req.session.user) {
		return res.redirect("/auth/login");
	}

	if (req.session.user.role !== "business") {
		return res.status(403).render("error", {
			title: "Access Denied",
			message: "You do not have permission to view this page.",
		});
	}

	next();
};

/**
 * Ensures user is authenticated for logout and other protected routes
 */
const authenticationMiddleware = (req, res, next) => {
	if (!req.session || !req.session.user) {
		return res.redirect("/auth/login");
	}
	next();
};

/**
 * Checks for XSS attempts in req.body
 */
const xssProtectionMiddleware = (req, res, next) => {
	// If there's a body, check all string properties for suspicious content
	if (req.body) {
		for (const key in req.body) {
			if (typeof req.body[key] === "string") {
				// Check for script tags, inline event handlers, etc.
				const value = req.body[key];
				if (
					value.includes("<script") ||
					value.includes("javascript:") ||
					/on\w+\s*=\s*["']/i.test(value)
				) {
					return res.status(400).render("error", {
						title: "Security Error",
						message: "Potentially malicious content detected.",
					});
				}
			}
		}
	}
	next();
};

export default {
	loggingMiddleware,
	loginRouteMiddleware,
	signupRouteMiddleware,
	adminRouteMiddleware,
	userRouteMiddleware,
	businessRouteMiddleware,
	authenticationMiddleware,
	xssProtectionMiddleware,
};
