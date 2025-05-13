import express from "express";
const app = express();
import configRoutes from "./routes/index.js";
import { engine } from "express-handlebars";
import session from "express-session";
import middleware from "./middleware.js";
import { dbConnection, getMongoClient } from "./config/mongoConnection.js";
import helmet from "helmet";
import xss from "xss-clean";
import BadgeService from "./services/badgeService.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Ensure required environment variables are set
const requiredEnvVars = ["SESSION_SECRET", "MONGODB_URI"];
for (const envVar of requiredEnvVars) {
	if (!process.env[envVar]) {
		console.error(`Missing required environment variable: ${envVar}`);
		process.exit(1);
	}
}

// Use environment variable for session secret
const SESSION_SECRET = process.env.SESSION_SECRET;

// Database connection setup with proper error handling
let db;
try {
	const client = await getMongoClient();
	db = await dbConnection();
	console.log("Connected to MongoDB successfully");
} catch (error) {
	console.error("Failed to connect to MongoDB:", error);
	process.exit(1);
}

// Initialize badges with proper error handling
try {
	await BadgeService.initializeDefaultBadges();
	console.log("Badges initialized successfully");
} catch (error) {
	console.error("Error initializing badges:", error);
	// Don't exit here, as this is not critical for app function
}

// Security middlewares with proper CSP configuration
app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: [
					"'self'",
					"'unsafe-inline'",
					"'unsafe-eval'",
					"https://cdn.jsdelivr.net",
				],
				styleSrc: [
					"'self'",
					"'unsafe-inline'",
					"https:",
					"https://cdn.jsdelivr.net",
				],
				imgSrc: ["'self'", "data:", "https:"],
				connectSrc: ["'self'"],
				fontSrc: ["'self'", "https:"],
				objectSrc: ["'none'"],
				mediaSrc: ["'self'"],
				frameSrc: ["'self'"],
			},
		},
	})
);
app.use(xss());

// Static file serving
app.use("/public", express.static("public"));
app.use("/node_modules", express.static("node_modules"));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration with secure settings
app.use(
	session({
		name: "CoFlow",
		secret: SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			maxAge: 1000 * 60 * 60 * 24,
			sameSite: "strict",
		},
	})
);

// Handlebars setup with fixed helper functions
app.engine(
	"handlebars",
	engine({
		defaultLayout: "main",
		helpers: {
			getCurrentYear: () => new Date().getFullYear(),
			eq: (v1, v2) => v1 === v2,
			add: (v1, v2) => v1 + v2,
			json: (context) => JSON.stringify(context),
			safe: (content) => {
				if (!content) return "";
				return content; // Let Handlebars handle escaping
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
				const [hours, minutes] = time.split(":");
				const hour = parseInt(hours);
				const ampm = hour >= 12 ? "PM" : "AM";
				const hour12 = hour % 12 || 12;
				return `${hour12}:${minutes} ${ampm}`;
			},
			groupByDate: (events) => {
				if (!Array.isArray(events)) return {};
				const grouped = {};
				events.forEach((event) => {
					if (!event.meetingDate) return;
					if (!grouped[event.meetingDate]) {
						grouped[event.meetingDate] = [];
					}
					grouped[event.meetingDate].push(event);
				});
				return grouped;
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
			lte: (v1, v2) => v1 <= v2,
			range: (start, end) => {
				const result = [];
				for (let i = start; i <= end; i++) {
					result.push(i);
				}
				return result;
			},
			toString: (value) => String(value),
			calculateAverage: (reviews) => {
				if (!reviews || !reviews.length) return "0.0";
				const sum = reviews.reduce(
					(total, review) => total + review.rating,
					0
				);
				return (sum / reviews.length).toFixed(1);
			},
			isMember: (group, userId) => {
				if (!group || !group.members || !userId) return false;
				return group.members.includes(userId);
			},
			canReview: (targetId, currentUserId) => {
				if (!targetId || !currentUserId) return false;
				return targetId !== currentUserId;
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

// 404 handler
app.use((req, res, next) => {
	res.status(404).render("error", {
		title: "404 Not Found",
		message: "The page you are looking for does not exist.",
		error: {
			status: 404,
			stack:
				process.env.NODE_ENV === "development"
					? "Page not found"
					: undefined,
		},
	});
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.error("Global error handler caught:", err);
	const statusCode = err.status || 500;
	res.status(statusCode).render("error", {
		title: `Error ${statusCode}`,
		message:
			statusCode === 500
				? "An unexpected error occurred"
				: err.message || "Something went wrong",
		error:
			process.env.NODE_ENV === "development"
				? {
						status: statusCode,
						message: err.message,
						stack: err.stack,
				  }
				: undefined,
	});
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
	console.log(`Environment: ${process.env.NODE_ENV}`);
});
