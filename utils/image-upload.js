import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { ValidationError } from "./error-utils.js";

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dknqbw5qg", // Default from existing code
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
	secure: true,
});

/**
 * Upload an image file to Cloudinary
 * @param {Buffer|string} fileData - Image data (buffer) or base64 string
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Upload result with URL and other details
 */
export const uploadImage = async (fileData, options = {}) => {
	try {
		// Set default options
		const uploadOptions = {
			folder: options.folder || "coflow/profile_pictures",
			resource_type: "image",
			...options,
		};

		// Upload image
		const result = await new Promise((resolve, reject) => {
			// For Buffer data (from multer)
			if (Buffer.isBuffer(fileData)) {
				cloudinary.uploader
					.upload_stream(uploadOptions, (error, result) => {
						if (error) reject(error);
						else resolve(result);
					})
					.end(fileData);
			}
			// For base64 data (from frontend upload)
			else if (
				typeof fileData === "string" &&
				fileData.startsWith("data:image")
			) {
				cloudinary.uploader.upload(
					fileData,
					uploadOptions,
					(error, result) => {
						if (error) reject(error);
						else resolve(result);
					}
				);
			}
			// For URL data (existing image)
			else if (
				typeof fileData === "string" &&
				(fileData.startsWith("http://") ||
					fileData.startsWith("https://"))
			) {
				cloudinary.uploader.upload(
					fileData,
					uploadOptions,
					(error, result) => {
						if (error) reject(error);
						else resolve(result);
					}
				);
			} else {
				reject(new ValidationError("Invalid image data provided"));
			}
		});

		return {
			url: result.secure_url,
			publicId: result.public_id,
			format: result.format,
			width: result.width,
			height: result.height,
		};
	} catch (error) {
		console.error("Error uploading image to Cloudinary:", error);
		throw new ValidationError(
			"Failed to upload image: " + (error.message || "Unknown error")
		);
	}
};

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - Public ID of the image
 * @returns {Promise<Object>} - Deletion result
 */
export const deleteImage = async (publicId) => {
	try {
		const result = await cloudinary.uploader.destroy(publicId);
		return result;
	} catch (error) {
		console.error("Error deleting image from Cloudinary:", error);
		throw new ValidationError(
			"Failed to delete image: " + (error.message || "Unknown error")
		);
	}
};

export default {
	uploadImage,
	deleteImage,
};
