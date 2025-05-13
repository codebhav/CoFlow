import { Router } from "express";
const router = Router();
import bcrypt from "bcrypt";
import * as userdata from "../data/user.js";
import middleware from "../middleware.js";
import Validation from "../helpers.js";
import * as admindata from "../data/admin.js";
import { ValidationError } from "../utils/error-utils.js";

/**
 * Route for signup page
 */
router
	.route("/signup")
	.get(middleware.signupRouteMiddleware, async (req, res) => {
		res.render("signup", { title: "Sign Up" });
	})
	.post(async (req, res) => {
		const formData = req.body;
		console.log("Signup Form Data:", formData);

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
			// Check for existing username
			const existingUsername = await userdata.findUserByUsername(
				userName
			);
			if (existingUsername) {
				return res.render("signup", {
					title: "Sign Up",
					error: "Username already exists.",
				});
			}

			// Check for existing email
			const existingEmail = await userdata.findUserByEmail(email);
			if (existingEmail) {
				return res.render("signup", {
					title: "Sign Up",
					error: "Email already registered.",
				});
			}

			// Validate required fields
			if (
				!userName ||
				!firstName ||
				!lastName ||
				!email ||
				!password ||
				!terms ||
				!privacy
			) {
				throw new ValidationError(
					"All required fields must have valid values"
				);
			}

			// Validate inputs
			userName = Validation.checkString(
				userName,
				"Username"
			).toLowerCase();
			firstName = Validation.checkString(
				firstName,
				"First name"
			).toLowerCase();
			lastName = Validation.checkString(
				lastName,
				"Last name"
			).toLowerCase();
			email = Validation.checkEmail(email).toLowerCase();
			password = Validation.checkPassword(password);

			// Process optional fields
			courses =
				courses !== ""
					? courses.split(",").map((element) => element.trim())
					: null;
			bio = bio ? Validation.checkString(bio, "Bio") : "";
			gender = gender ? Validation.checkGender(gender) : "";
			city = city ? Validation.checkString(city, "City") : "";
			state = state ? Validation.checkString(state, "State") : "";
			dob = dob ? Validation.checkDate(dob) : "";
			courses = courses
				? Validation.checkStringArray(courses, "Courses")
				: [];
			education = education ? Validation.checkEducation(education) : [];

			if (terms !== "on" || privacy !== "on") {
				throw new ValidationError(
					"You must agree to the terms and privacy policy"
				);
			}

			// Hash password and create user
			const hashedPassword = await bcrypt.hash(password, 10);
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

			if (newUser) {
				// Set session and redirect
				req.session.user = {
					id: newUser._id,
					userName: newUser.userName,
					firstName: newUser.firstName,
					lastName: newUser.lastName,
					role: newUser.role,
				};
				return res.redirect("/profile");
			} else {
				throw new Error("Failed to create user");
			}
		} catch (error) {
			console.error("Error during signup:", error);
			return res.render("signup", {
				title: "Sign Up",
				error: error.message || "An error occurred during signup",
			});
		}
	});

/**
 * Route for login page
 */
router
	.route("/login")
	.get(middleware.loginRouteMiddleware, async (req, res) => {
		res.render("login", { title: "Login" });
	})
	.post(async (req, res) => {
		const { userName, password } = req.body;

		try {
			if (!userName || !password) {
				throw new ValidationError("Username and password are required");
			}

			// Validate and authenticate user
			const validatedUserName = Validation.checkString(
				userName,
				"Username"
			);
			const validatedPassword = Validation.checkString(
				password,
				"Password"
			);

			const user = await userdata.checkLogin(
				validatedUserName,
				validatedPassword
			);

			if (!user) {
				throw new ValidationError("Invalid username or password");
			}

			// Set session
			req.session.user = {
				id: user._id,
				userName: user.userName,
				firstName: user.firstName || "",
				lastName: user.lastName || "",
				role: user.role,
			};

			// Redirect based on role
			switch (user.role) {
				case "user":
					return res.redirect("/profile");
				case "business":
					return res.redirect("/profile/business");
				case "admin":
					return res.redirect("/admin/admin-table");
				default:
					return res.redirect("/");
			}
		} catch (error) {
			console.error("Error during login:", error);
			return res.render("login", {
				title: "Login",
				error: error.message || "Invalid username or password",
			});
		}
	});

/**
 * Route for logout
 */
router
	.route("/logout")
	.get(middleware.authenticationMiddleware, async (req, res) => {
		req.session.destroy(() => {
			res.redirect("/auth/login");
		});
	});

// Commenting out incomplete badge functionality for now
/*
router.route('/badges/:username')
    .get(async (req, res) => {
        try {
            const user = await userdata.findUserByUsername(req.params.username);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            // This will be expanded in Stage 5 to return proper badge information
            res.json({ badges: user.badgeIds || [] });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
*/

export default router;
