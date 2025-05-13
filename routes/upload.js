import { Router } from "express";
const router = Router();
import multer from "multer";
import * as userdata from "../data/user.js";
import middleware from "../middleware.js";
import { uploadImage } from "../utils/image-upload.js";
import { ValidationError } from "../utils/error-utils.js";
import { asyncHandler } from "../utils/error-utils.js";

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
	storage: storage,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB limit
	},
	fileFilter: (req, file, cb) => {
		// Accept only image files
		if (!file.mimetype.startsWith("image/")) {
			return cb(
				new ValidationError("Only image files are allowed"),
				false
			);
		}
		cb(null, true);
	},
});

/**
 * POST /upload/profile-picture - Upload profile picture
 */
router.post(
	"/profile-picture",
	middleware.authenticationMiddleware,
	upload.single("profileImage"),
	asyncHandler(async (req, res) => {
		try {
			if (!req.file) {
				throw new ValidationError("No image file provided");
			}

			// Get user ID from session
			const userId = req.session.user.id;

			// Upload image to Cloudinary
			const imageData = req.file.buffer;
			const uploadResult = await uploadImage(imageData, {
				folder: `coflow/profile_pictures/${userId}`,
				transformation: [{ width: 300, height: 300, crop: "limit" }],
			});

			// Update user profile with new image URL
			const user = await userdata.findUserById(userId);
			if (!user) {
				throw new ValidationError("User not found");
			}

			await userdata.updateUserProfile(
				user.userName,
				user.userName,
				user.firstName,
				user.lastName,
				user.email,
				user.bio,
				user.gender,
				user.state,
				user.city,
				user.dob,
				user.courses,
				user.education,
				uploadResult.url
			);

			// Return success with image URL
			return res.json({
				success: true,
				imageUrl: uploadResult.url,
				message: "Profile picture uploaded successfully",
			});
		} catch (error) {
			console.error("Error uploading profile picture:", error);
			return res.status(400).json({
				success: false,
				message: error.message || "Failed to upload profile picture",
			});
		}
	})
);

/**
 * POST /upload/base64 - Upload image from base64 data
 * Used for client-side image processing before upload
 */
router.post(
	"/base64",
	middleware.authenticationMiddleware,
	asyncHandler(async (req, res) => {
		try {
			const { imageData } = req.body;

			if (!imageData || !imageData.startsWith("data:image/")) {
				throw new ValidationError("Invalid image data");
			}

			// Get user ID from session
			const userId = req.session.user.id;

			// Upload base64 image to Cloudinary
			const uploadResult = await uploadImage(imageData, {
				folder: `coflow/profile_pictures/${userId}`,
				transformation: [{ width: 300, height: 300, crop: "limit" }],
			});

			// Update user profile with new image URL
			const user = await userdata.findUserById(userId);
			if (!user) {
				throw new ValidationError("User not found");
			}

			await userdata.updateUserProfile(
				user.userName,
				user.userName,
				user.firstName,
				user.lastName,
				user.email,
				user.bio,
				user.gender,
				user.state,
				user.city,
				user.dob,
				user.courses,
				user.education,
				uploadResult.url
			);

			// Return success with image URL
			return res.json({
				success: true,
				imageUrl: uploadResult.url,
				message: "Profile picture uploaded successfully",
			});
		} catch (error) {
			console.error("Error uploading profile picture:", error);
			return res.status(400).json({
				success: false,
				message: error.message || "Failed to upload profile picture",
			});
		}
	})
);

export default router;
