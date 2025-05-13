import express from "express";
const app = express();
import configRoutes from "./routes/index.js";
import { engine } from "express-handlebars";
import session from "express-session";
import middleware from "./middleware.js";
import { dbConnection, getMongoClient } from "./config/mongoConnection.js";
import helmet from "helmet";
import xss from "xss-clean";
import * as badgeService from "./services/badgeService.js";

// Generate a random session secret (in production, use an env variable)
const SESSION_SECRET =
	process.env.SESSION_SECRET ||
	Math.random().toString(36).substring(2) +
		Math.random().toString(36).substring(2);

// Database connection setup
try {
	const client = await getMongoClient();
	const db = await dbConnection();
	console.log("Connected to MongoDB successfully");
} catch (error) {
	console.error("Failed to connect to MongoDB:", error);
	process.exit(1); // Exit if we can't connect to the database
}

// Initialize badges
try {
	await badgeService.initializeBadges();
	console.log("Badges initialized successfully");
} catch (error) {
	console.error("Error initializing badges:", error);
}

// Security middlewares
app.use(helmet({ contentSecurityPolicy: false })); // Disable CSP for development
app.use(xss()); // Prevent XSS attacks

// Static file serving
app.use("/public", express.static("public"));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
	session({
		name: "CoFlow",
		secret: SESSION_SECRET,
		resave: false,
		saveUninitialized: false, // Changed to false for GDPR compliance
		cookie: {
			httpOnly: true, // Helps protect against XSS
			secure: process.env.NODE_ENV === "production", // HTTPS only in production
			maxAge: 1000 * 60 * 60 * 24, // 1 day
		},
	})
);

// Handlebars setup
app.engine(
	"handlebars",
	engine({
		defaultLayout: "main",
		helpers: {
			getCurrentYear: () => new Date().getFullYear(),
			eq: (v1, v2) => v1 === v2,
			add: (v1, v2) => v1 + v2,
			json: (context) => JSON.stringify(context), // Add helper for JSON stringification
			// Additional safety helpers for output
			safe: (content) => {
				if (!content) return "";
				return new Handlebars.SafeString(content);
			},
			capitalize: (text) => {
				if (!text) return "";
				return text.charAt(0).toUpperCase() + text.slice(1);
			},
			formatDate: (date) => {
				if (!date) return "";
				const d = new Date(date);
				if (isNaN(d.getTime())) return date;
				return d.toLocaleDateString();
			},
			formatTime: (time) => {
				if (!time) return "";
				// For HH:MM format, convert to 12-hour format
				const [hours, minutes] = time.split(":");
				const hour = parseInt(hours);
				const ampm = hour >= 12 ? "PM" : "AM";
				const hour12 = hour % 12 || 12;
				return `${hour12}:${minutes} ${ampm}`;
			},
			getCapacityClass: (current, max) => {
				const ratio = current / max;
				if (ratio >= 1) return "full";
				if (ratio >= 0.8) return "almost-full";
				return "";
			},
			join: (arr, separator) => {
				if (!Array.isArray(arr)) return "";
				return arr.join(separator);
			},
			truncate: (text, length) => {
				if (!text) return "";
				if (text.length <= length) return text;
				return text.substring(0, length) + "...";
			},
		},
	})
);
app.set("view engine", "handlebars");

// Apply custom middlewares
app.use(middleware.loggingMiddleware);
app.use(middleware.xssProtectionMiddleware);

// Configure routes
configRoutes(app);

// Error handling middleware
app.use((err, req, res, next) => {
	console.error("Global error handler caught:", err);
	res.status(500).render("error", {
		title: "Error",
		message: "An unexpected error occurred",
		error: process.env.NODE_ENV === "development" ? err.message : undefined,
	});
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
