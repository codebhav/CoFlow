import { Router } from "express";
const router = Router();
import bcrypt from "bcrypt";
import * as userdata from "../data/user.js";
import * as admindata from "../data/admin.js";
import * as businessdata from "../data/business.js";
import middleware from "../middleware.js";
import Validation from "../helpers.js";
import * as badgeService from "../services/badgeService.js";

import {
	ValidationError,
	NotFoundError,
	AuthenticationError,
} from "../utils/error-utils.js";
import { asyncHandler } from "../utils/error-utils.js";

/**
 * GET /auth/signup - Render signup form
 */
router
	.route("/signup")
	.get(middleware.signupRouteMiddleware, (req, res) => {
		res.render("signup", {
			title: "Sign Up",
			states: [
				"AL",
				"AK",
				"AZ",
				"AR",
				"CA",
				"CO",
				"CT",
				"DE",
				"FL",
				"GA",
				"HI",
				"ID",
				"IL",
				"IN",
				"IA",
				"KS",
				"KY",
				"LA",
				"ME",
				"MD",
				"MA",
				"MI",
				"MN",
				"MS",
				"MO",
				"MT",
				"NE",
				"NV",
				"NH",
				"NJ",
				"NM",
				"NY",
				"NC",
				"ND",
				"OH",
				"OK",
				"OR",
				"PA",
				"RI",
				"SC",
				"SD",
				"TN",
				"TX",
				"UT",
				"VT",
				"VA",
				"WA",
				"WV",
				"WI",
				"WY",
			],
		});
	})
	.post(
		asyncHandler(async (req, res) => {
			// Extract form data
			let {
				userName,
				firstName,
				lastName,
				email,
				password,
				bio,
				gender,
				city,
				state,
				dob,
				courses,
				education,
				terms,
				privacy,
			} = req.body;

			try {
				// Validate required fields
				if (
					!userName ||
					!firstName ||
					!lastName ||
					!email ||
					!password
				) {
					throw new ValidationError(
						"All required fields must be provided"
					);
				}

				if (!terms || !privacy) {
					throw new ValidationError(
						"You must agree to Terms of Use and Privacy Policy"
					);
				}

				// Check for existing username or email (case insensitive)
				const existingUsername = await userdata.findUserByUsername(
					userName
				);
				if (existingUsername) {
					throw new ValidationError("Username already exists");
				}

				const existingEmail = await userdata.findUserByEmail(email);
				if (existingEmail) {
					throw new ValidationError("Email is already registered");
				}

				// Validate and sanitize inputs
				userName = Validation.checkUserName(userName);
				firstName = Validation.checkString(firstName, "First name");
				lastName = Validation.checkString(lastName, "Last name");
				email = Validation.checkEmail(email);

				// Validate password strength
				Validation.checkPassword(password);

				// Process optional fields
				bio = bio ? Validation.checkString(bio, "Bio") : "";
				gender = gender ? Validation.checkGender(gender) : "";
				city = city ? Validation.checkString(city, "City") : "";
				state = state ? Validation.checkString(state, "State") : "";
				dob = dob ? Validation.checkDate(dob) : "";

				// Process courses (comma-separated string to array)
				if (courses) {
					courses = courses.split(",").map((course) => course.trim());
					courses = Validation.checkStringArray(courses, "Courses");
				} else {
					courses = [];
				}

				// Process education JSON data
				if (typeof education === "string") {
					try {
						education = JSON.parse(education);
					} catch (e) {
						console.error("Error parsing education data:", e);
						education = [];
					}
				}
				education = education
					? Validation.checkEducation(education)
					: [];

				// Hash password (with appropriate cost factor)
				const saltRounds = 10;
				const hashedPassword = await bcrypt.hash(password, saltRounds);

				// Create new user
				const newUser = await userdata.createUser(
					userName,
					firstName,
					lastName,
					email,
					hashedPassword,
					bio,
					gender,
					city,
					state,
					dob,
					courses,
					education,
					terms,
					privacy
				);
				await badgeService.awardNewUserBadge(newUser._id);

				// Set session data
				req.session.user = {
					id: newUser._id,
					userName: newUser.userName,
					firstName: newUser.firstName,
					lastName: newUser.lastName,
					role: newUser.role,
				};

				// Redirect to profile page
				return res.redirect("/profile");
			} catch (error) {
				// For validation errors, retain form data
				return res.status(400).render("signup", {
					title: "Sign Up",
					error: error.message,
					states: [
						"AL",
						"AK",
						"AZ",
						"AR",
						"CA",
						"CO",
						"CT",
						"DE",
						"FL",
						"GA",
						"HI",
						"ID",
						"IL",
						"IN",
						"IA",
						"KS",
						"KY",
						"LA",
						"ME",
						"MD",
						"MA",
						"MI",
						"MN",
						"MS",
						"MO",
						"MT",
						"NE",
						"NV",
						"NH",
						"NJ",
						"NM",
						"NY",
						"NC",
						"ND",
						"OH",
						"OK",
						"OR",
						"PA",
						"RI",
						"SC",
						"SD",
						"TN",
						"TX",
						"UT",
						"VT",
						"VA",
						"WA",
						"WV",
						"WI",
						"WY",
					],
					userName,
					firstName,
					lastName,
					email,
					bio,
					gender,
					city,
					state,
					dob,
					courses,
				});
			}
		})
	);

/**
 * GET /auth/login - Render login form
 * POST /auth/login - Process login attempt
 */
router
	.route("/login")
	.get(middleware.loginRouteMiddleware, (req, res) => {
		res.render("login", { title: "Login" });
	})
	.post(
		asyncHandler(async (req, res) => {
			const { userName, password } = req.body;

			try {
				// Validate inputs
				if (!userName || !password) {
					throw new ValidationError(
						"Username and password are required"
					);
				}

				let user = null;

				// Try to find user (first try by username, then by email)
				try {
					// First try to find by username
					user = await userdata.findUserByUsername(userName);

					// If not found, try by email
					// if (!user) {
					// 	user = await userdata.findUserByEmail(userName);
					// }

					// If still not found, try in admin collection
					if (!user) {
						try {
							user = await admindata.findAdminByadminName(
								userName
							);
						} catch (e) {
							// Not found in admin collection
						}
					}

					// If still not found, try in business collection
					if (!user) {
						try {
							user = await businessdata.findBuserByUsername(
								userName
							);
						} catch (e) {
							// Not found in business collection
						}
					}

					if (!user) {
						throw new AuthenticationError(
							"Invalid username or password"
						);
					}
				} catch (e) {
					throw new AuthenticationError(
						"Invalid username or password"
					);
				}

				// Verify password
				const passwordMatch = await bcrypt.compare(
					password,
					user.hashedPassword
				);
				if (!passwordMatch) {
					throw new AuthenticationError(
						"Invalid username or password"
					);
				}

				// Set session data
				req.session.user = {
					id: user._id,
					userName: user.userName,
					firstName: user.firstName || "",
					lastName: user.lastName || "",
					role: user.role,
				};

				// Redirect based on role
				switch (user.role) {
					case "admin":
						return res.redirect("/admin/admin-table");
					case "business":
						return res.redirect("/profile/business");
					case "user":
					default:
						return res.redirect("/profile");
				}
			} catch (error) {
				return res.status(401).render("login", {
					title: "Login",
					error: error.message,
					userName,
				});
			}
		})
	);

/**
 * GET /auth/logout - Log out user by destroying session
 */
router.route("/logout").get(middleware.authenticationMiddleware, (req, res) => {
	// Destroy session
	req.session.destroy((err) => {
		if (err) {
			console.error("Error destroying session:", err);
		}
		// Redirect to login page
		res.redirect("/auth/login");
	});
});

/**
 * GET /auth/business-signup - Render business signup form (to be implemented in Stage 9)
 */
router
	.route("/business-signup")
	.get(middleware.signupRouteMiddleware, (req, res) => {
		res.render("business-signup", {
			title: "Business Sign Up",
			states: [
				"AL",
				"AK",
				"AZ",
				"AR",
				"CA",
				"CO",
				"CT",
				"DE",
				"FL",
				"GA",
				"HI",
				"ID",
				"IL",
				"IN",
				"IA",
				"KS",
				"KY",
				"LA",
				"ME",
				"MD",
				"MA",
				"MI",
				"MN",
				"MS",
				"MO",
				"MT",
				"NE",
				"NV",
				"NH",
				"NJ",
				"NM",
				"NY",
				"NC",
				"ND",
				"OH",
				"OK",
				"OR",
				"PA",
				"RI",
				"SC",
				"SD",
				"TN",
				"TX",
				"UT",
				"VT",
				"VA",
				"WA",
				"WV",
				"WI",
				"WY",
			],
		});
	});

export default router;
