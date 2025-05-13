import profileRoutes from "./profile.js";
import authRoutes from "./auth.js";
import homeRoutes from "./home.js";
import policyRoutes from "./policy.js";
import adminRoutes from "./admin.js";
import groupRoutes from "./groups.js";
import uploadRoutes from "./upload.js";
import { static as staticDir } from "express";
import { logAuthStatus } from "../middleware/auth-middleware.js";

/**
 * Configure all application routes
 * @param {Express} app - Express application
 */
const configureRoutes = (app) => {
	// Log all requests with authentication info
	app.use(logAuthStatus);

	// Static files
	app.use("/public", staticDir("public"));

	// Application routes
	app.use("/", homeRoutes);
	app.use("/auth", authRoutes);
	app.use("/admin", adminRoutes);
	app.use("/profile", profileRoutes);
	app.use("/policy", policyRoutes);
	app.use("/groups", groupRoutes);
	app.use("/upload", uploadRoutes);

	// 404 handler for undefined routes
	app.use("*", (req, res) => {
		res.status(404).render("error", {
			title: "404 Not Found",
			message: "The page you are looking for does not exist.",
		});
	});

	// Global error handler
	app.use((err, req, res, next) => {
		console.error("Global error handler caught:", err);

		const statusCode = err.status || 500;
		const errorMessage =
			process.env.NODE_ENV === "production"
				? "An unexpected error occurred"
				: err.message || "Unknown error";

		res.status(statusCode).render("error", {
			title: `Error ${statusCode}`,
			message: errorMessage,
		});
	});
};

export default configureRoutes;
