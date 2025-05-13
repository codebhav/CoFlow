import { Router } from "express";
const router = Router();
import * as admindata from "../data/admin.js";
import * as userdata from "../data/user.js";
import middleware from "../middleware.js";
import bcrypt from "bcrypt";
import { ValidationError } from "../utils/error-utils.js";

/**
 * Route for admin table page
 * Only accessible to admins
 */
router
	.route("/admin-table")
	.get(middleware.adminRouteMiddleware, async (req, res) => {
		try {
			const user = await admindata.findAdminById(req.session.user.id);
			const user_table = await userdata.getAllUsers();
			const admin_table = await admindata.getAllAdmin();

			res.render("admin-table", {
				title: "Admin",
				user: user,
				user_table: user_table,
				admin_table: admin_table,
			});
		} catch (error) {
			console.error("Error fetching admin table:", error);
			res.status(500).render("error", {
				title: "Error",
				message:
					error.message ||
					"An error occurred while loading admin table",
			});
		}
	});

/**
 * API route for admin registration
 * This should be protected in production
 */
router.route("/admin-register").post(async (req, res) => {
	try {
		const { username, password } = req.body;

		if (!username || !password) {
			return res
				.status(400)
				.json({ message: "Username and password are required" });
		}

		// Validate password length
		if (password.length < 8 || password.length > 30) {
			return res.status(400).json({
				message: "Password must be between 8 and 30 characters",
			});
		}

		// Check if admin exists
		const existingAdmin = await admindata.findAdminByadminName(username);
		if (existingAdmin) {
			return res.status(400).json({ message: "Admin already exists" });
		}

		// Hash password and create admin
		const hashedPassword = await bcrypt.hash(password, 10);
		const newAdmin = await admindata.createAdmin(username, hashedPassword);

		// Return success with admin info (excluding password)
		const { hashedPassword: _, ...adminInfo } = newAdmin;
		res.status(201).json({
			message: "Admin created successfully",
			admin: adminInfo,
		});
	} catch (error) {
		console.error("Admin Signup error:", error);
		res.status(500).json({ message: error.message || "Server error" });
	}
});

export default router;
