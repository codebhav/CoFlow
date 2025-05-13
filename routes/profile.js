import { Router } from "express";
const router = Router();
import * as userdata from "../data/user.js";
import middleware from "../middleware.js";
import Validation from "../helpers.js";
import { ValidationError, NotFoundError } from "../utils/error-utils.js";
import { asyncHandler } from "../utils/error-utils.js";

/**
 * GET /profile - Render user profile page
 * POST /profile - Update user profile
 */
router
	.route("/")
	.get(
		middleware.userRouteMiddleware,
		asyncHandler(async (req, res) => {
			try {
				// Get user data from database
				const user = await userdata.findUserById(req.session.user.id);
				if (!user) {
					throw new NotFoundError("User not found");
				}

				// Render profile page with user data
				return res.render("profile", {
					title: "Profile",
					user: user,
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
			} catch (error) {
				console.error("Error fetching profile:", error);

				if (error instanceof NotFoundError) {
					req.session.destroy();
					return res.redirect("/auth/login");
				}

				return res.status(500).render("error", {
					title: "Error",
					message: error.message || "Failed to load profile",
				});
			}
		})
	)
	.post(
		middleware.userRouteMiddleware,
		asyncHandler(async (req, res) => {
			// Extract form data
			let {
				profilePicture,
				userName,
				firstName,
				lastName,
				email,
				bio,
				gender,
				state,
				city,
				dob,
				courses,
				education,
			} = req.body;

			// Get original username from session
			const lastUserName = req.session.user.userName;

			try {
				// Validate required fields
				if (!userName || !firstName || !lastName || !email) {
					throw new ValidationError(
						"Name, username, and email are required"
					);
				}

				// Check if username changed and is already taken
				if (userName.toLowerCase() !== lastUserName.toLowerCase()) {
					const existingUser = await userdata.findUserByUsername(
						userName
					);
					if (existingUser) {
						throw new ValidationError("Username already exists");
					}
				}

				// Check if email changed and is already taken
				const originalUser = await userdata.findUserByUsername(
					lastUserName
				);
				if (email.toLowerCase() !== originalUser.email.toLowerCase()) {
					const existingEmail = await userdata.findUserByEmail(email);
					if (existingEmail) {
						throw new ValidationError("Email already registered");
					}
				}

				// Validate inputs
				userName = Validation.checkUserName(userName);
				firstName = Validation.checkString(firstName, "First name");
				lastName = Validation.checkString(lastName, "Last name");
				email = Validation.checkEmail(email);

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

				// Process education
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

				// Validate profile picture URL
				profilePicture = profilePicture
					? Validation.checkImageUrl(profilePicture)
					: "";

				// Update user profile
				const updatedUser = await userdata.updateUserProfile(
					lastUserName,
					userName,
					firstName,
					lastName,
					email,
					bio,
					gender,
					state,
					city,
					dob,
					courses,
					education,
					profilePicture
				);

				// Update session if username changed
				if (updatedUser.userName !== lastUserName) {
					req.session.user = {
						id: updatedUser._id,
						userName: updatedUser.userName,
						firstName: updatedUser.firstName,
						lastName: updatedUser.lastName,
						role: updatedUser.role,
					};
				}

				// Redirect to profile page with success message
				return res.render("profile", {
					title: "Profile",
					user: updatedUser,
					success: "Profile updated successfully",
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
			} catch (error) {
				console.error("Error updating profile:", error);

				// Get user data to re-render form with error
				const user = await userdata.findUserById(req.session.user.id);

				return res.status(400).render("profile", {
					title: "Profile",
					user: user,
					error: error.message || "Error updating profile",
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
			}
		})
	);

/**
 * GET /profile/business - Render business profile page
 * This route will be fully implemented in Stage 9
 */
router.route("/business").get(
	middleware.businessRouteMiddleware,
	asyncHandler(async (req, res) => {
		try {
			// This is a placeholder until Stage 9 implementation
			res.render("business-profile", {
				title: "Business Profile",
				message: "Business profile will be implemented in Stage 9",
			});
		} catch (error) {
			console.error("Error fetching business profile:", error);
			res.status(500).render("error", {
				title: "Error",
				message: error.message || "Failed to load business profile",
			});
		}
	})
);

/**
 * GET /profile/upload - Render profile picture upload form
 * POST /profile/upload - Process profile picture upload
 * Will be fully implemented later with Cloudinary
 */
router.route("/upload").get(middleware.authenticationMiddleware, (req, res) => {
	// Get user data from session
	const userId = req.session.user.id;

	// Find user to pass to the template
	userdata
		.findUserById(userId)
		.then((user) => {
			res.render("profile-upload", {
				title: "Upload Profile Picture",
				user: user,
			});
		})
		.catch((error) => {
			console.error("Error fetching user for upload:", error);
			res.status(500).render("error", {
				title: "Error",
				message: "Failed to load profile upload page",
			});
		});
});

export default router;
