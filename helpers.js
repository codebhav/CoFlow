import { ObjectId } from "mongodb";
import xss from "xss";
import { ValidationError } from "./utils/error-utils.js";

const exportedMethods = {
	/**
	 * Sanitize a string to prevent XSS attacks
	 * @param {string} str - String to sanitize
	 * @returns {string} - Sanitized string
	 */
	sanitizeString(str) {
		if (typeof str !== "string") return str;
		return xss(str);
	},

	/**
	 * Validate and sanitize a MongoDB ObjectId
	 * @param {string} id - The ID to validate
	 * @param {string} varName - Name of the variable for error messages
	 * @returns {string} - Validated and sanitized ID
	 */
	checkId(id, varName = "ID") {
		if (!id) throw new ValidationError(`${varName} is required`);
		if (typeof id !== "string")
			throw new ValidationError(`${varName} must be a string`);

		id = id.trim();
		if (id.length === 0) {
			throw new ValidationError(`${varName} cannot be empty`);
		}

		// If it's already a valid ObjectId string, return it
		if (ObjectId.isValid(id)) {
			return id;
		}

		// If it's a regular string ID (e.g., from auth), just validate it's not empty
		if (id.length > 0) {
			return id;
		}

		throw new ValidationError(`${varName} is not a valid ID`);
	},

	/**
	 * Validate and sanitize a string input
	 * @param {string} strVal - The string to validate
	 * @param {string} varName - Name of the variable for error messages
	 * @returns {string} - Validated and sanitized string
	 */
	checkString(strVal, varName = "Input") {
		if (!strVal) throw new ValidationError(`${varName} is required`);
		if (typeof strVal !== "string")
			throw new ValidationError(`${varName} must be a string`);

		strVal = strVal.trim();
		if (strVal.length === 0) {
			throw new ValidationError(`${varName} cannot be empty`);
		}

		// Check if string is only digits - this may be unnecessary for some fields
		if (!isNaN(strVal) && /^\d+$/.test(strVal)) {
			throw new ValidationError(`${varName} cannot be just a number`);
		}

		return this.sanitizeString(strVal);
	},

	/**
	 * Validate an array of strings
	 * @param {Array} arr - Array of strings to validate
	 * @param {string} varName - Name of the variable for error messages
	 * @returns {Array} - Validated array of strings
	 */
	checkStringArray(arr, varName) {
		if (!arr || !Array.isArray(arr))
			throw new ValidationError(
				`You must provide an array of ${varName}`
			);

		for (let i in arr) {
			if (typeof arr[i] !== "string" || arr[i].trim().length === 0) {
				throw new ValidationError(
					`One or more elements in ${varName} array is not a string or is an empty string`
				);
			}
			arr[i] = this.sanitizeString(arr[i].trim());
		}

		return arr;
	},

	/**
	 * Validate a number
	 * @param {number|string} number - Number to validate
	 * @returns {number} - Validated number
	 */
	checkNumber(number) {
		if (!number) throw new ValidationError("Number input is required");

		if (typeof number === "string") {
			number = number.trim();
			if (number.length === 0) {
				throw new ValidationError("Number input cannot be just spaces");
			}
			number = Number(number);
		}

		if (isNaN(number)) throw new ValidationError("Input must be a number");
		if (!Number.isInteger(number))
			throw new ValidationError("Input must be an integer");
		if (typeof number !== "number")
			throw new ValidationError("Input must be a number");

		return number;
	},

	/**
	 * Validate and sanitize an email address
	 * @param {string} email - Email to validate
	 * @returns {string} - Validated and sanitized email
	 */
	checkEmail(email) {
		if (!email) throw new ValidationError("Email is required");
		if (typeof email !== "string")
			throw new ValidationError("Email must be a string");

		email = email.trim().toLowerCase();
		if (email.length === 0) {
			throw new ValidationError("Email cannot be empty");
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
		if (!emailRegex.test(email)) {
			throw new ValidationError("Invalid email format");
		}

		return this.sanitizeString(email);
	},

	/**
	 * Validate date format (YYYY-MM-DD)
	 * @param {string} date - The date string to validate
	 * @returns {string} - Validated date string
	 */
	checkDate(date) {
		if (!date) throw new ValidationError("Date is required");
		if (typeof date !== "string")
			throw new ValidationError("Date must be a string");

		date = date.trim();
		if (date.length === 0) {
			throw new ValidationError("Date cannot be empty");
		}

		// Validate format YYYY-MM-DD
		const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
		const match = date.match(dateRegex);
		if (!match) {
			throw new ValidationError("Date must be in format YYYY-MM-DD");
		}

		const year = parseInt(match[1], 10);
		const month = parseInt(match[2], 10);
		const day = parseInt(match[3], 10);

		// Basic year validation
		const currentYear = new Date().getFullYear();
		if (year < 1900 || year > currentYear + 10) {
			throw new ValidationError(
				"Year must be between 1900 and " + (currentYear + 10)
			);
		}

		// Month validation
		if (month < 1 || month > 12) {
			throw new ValidationError("Month must be between 01 and 12");
		}

		// Day validation based on month
		const daysInMonth = new Date(year, month, 0).getDate();
		if (day < 1 || day > daysInMonth) {
			throw new ValidationError(
				`Day must be between 01 and ${daysInMonth} for the given month`
			);
		}

		// Verify date validity
		const dateValid = new Date(year, month - 1, day);
		if (
			dateValid.getFullYear() !== year ||
			dateValid.getMonth() !== month - 1 ||
			dateValid.getDate() !== day
		) {
			throw new ValidationError(
				"Invalid date: The provided year, month, and day do not form a valid date."
			);
		}

		// Format date consistently
		const formattedMonth = month.toString().padStart(2, "0");
		const formattedDay = day.toString().padStart(2, "0");
		return `${year}-${formattedMonth}-${formattedDay}`;
	},

	/**
	 * Validate gender input
	 * @param {string} gender - Gender to validate
	 * @returns {string} - Validated and normalized gender
	 */
	checkGender(gender) {
		if (!gender) throw new ValidationError("Gender is required");
		if (typeof gender !== "string")
			throw new ValidationError("Gender must be a string");

		gender = gender.trim().toLowerCase();
		if (gender.length === 0) {
			throw new ValidationError("Gender cannot be empty");
		}

		const validGenders = ["male", "female", "other"];
		if (!validGenders.includes(gender)) {
			throw new ValidationError(
				"Gender must be one of: Male, Female, Other"
			);
		}

		return gender;
	},

	/**
	 * Check city validity (to be implemented)
	 * @param {string} state - State
	 * @param {string} city - City
	 */
	checkCity(state, city) {
		// To be implemented with city validation logic
		if (!city) throw new ValidationError("City is required");
		return this.checkString(city, "City");
	},

	/**
	 * Check state validity (to be implemented)
	 * @param {string} state - State
	 */
	checkState(state) {
		// To be implemented with state validation logic
		if (!state) throw new ValidationError("State is required");
		return this.checkString(state, "State");
	},

	/**
	 * Validate education array
	 * @param {Array} education - Array of education objects
	 * @returns {Array} - Validated education array
	 */
	checkEducation(education) {
		if (!education) return [];
		if (!Array.isArray(education))
			throw new ValidationError("Education must be an array");

		const validatedEducation = education
			.filter((entry) => {
				// Skip completely empty objects or non-objects
				if (
					!entry ||
					typeof entry !== "object" ||
					Object.keys(entry).length === 0
				) {
					return false;
				}
				// skip without school Name object
				if (!entry.schoolName || entry.schoolName.trim().length === 0) {
					return false;
				}

				return true;
			})
			.map((entry) => {
				const validatedEntry = {};

				validatedEntry.schoolName = this.checkString(
					entry.schoolName,
					"School Name"
				);

				if (
					entry.educationLevel &&
					entry.educationLevel.trim().length > 0
				) {
					validatedEntry.educationLevel = this.checkString(
						entry.educationLevel,
						"Education Level"
					);
				} else {
					validatedEntry.educationLevel = "";
				}

				if (entry.major && entry.major.trim().length > 0) {
					validatedEntry.major = this.checkString(
						entry.major,
						"Major"
					);
				} else {
					validatedEntry.major = "";
				}

				// Validate start date if provided
				if (entry.startDate && entry.startDate.trim().length > 0) {
					validatedEntry.startDate = this.checkDate(entry.startDate);
				} else {
					validatedEntry.startDate = "";
				}

				if (entry.endDate && entry.endDate.trim().length > 0) {
					validatedEntry.endDate = this.checkDate(entry.endDate);
				} else {
					validatedEntry.endDate = "";
				}

				return validatedEntry;
			});

		return validatedEducation;
	},

	/**
	 * Validate username format
	 * @param {string} userName - Username to validate
	 * @returns {string} - Validated username
	 */
	checkUserName(userName) {
		if (!userName) throw new ValidationError("Username is required");
		if (typeof userName !== "string")
			throw new ValidationError("Username must be a string");

		userName = userName.trim();
		if (userName.length === 0) {
			throw new ValidationError("Username cannot be empty");
		}

		if (!isNaN(userName)) {
			throw new ValidationError(
				"Username cannot consist only of numbers"
			);
		}

		if (userName.length < 5 || userName.length > 20) {
			throw new ValidationError(
				"Username must be between 5 and 20 characters"
			);
		}

		return this.sanitizeString(userName);
	},

	/**
	 * Validate password strength
	 * @param {string} password - Password to validate
	 * @returns {string} - Validated password
	 */
	checkPassword(password) {
		if (!password) throw new ValidationError("Password is required");
		if (typeof password !== "string")
			throw new ValidationError("Password must be a string");

		password = password.trim();
		if (password.length === 0) {
			throw new ValidationError("Password cannot be empty");
		}

		if (password.length < 8) {
			throw new ValidationError("Password must be at least 8 characters");
		}

		const uppercaseChar = /[A-Z]/;
		const lowercaseChar = /[a-z]/;
		const digitChar = /[0-9]/;
		const specialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

		if (!uppercaseChar.test(password)) {
			throw new ValidationError(
				"Password must contain at least one uppercase letter"
			);
		}

		if (!lowercaseChar.test(password)) {
			throw new ValidationError(
				"Password must contain at least one lowercase letter"
			);
		}

		if (!digitChar.test(password)) {
			throw new ValidationError(
				"Password must contain at least one number"
			);
		}

		if (!specialChar.test(password)) {
			throw new ValidationError(
				"Password must contain at least one special character"
			);
		}

		return password;
	},

	/**
	 * Calculate age from date of birth
	 * @param {string} dob - Date of birth in YYYY-MM-DD format
	 * @returns {number} - Age in years
	 */
	getAge(dob) {
		dob = this.checkDate(dob);
		const birthDate = new Date(dob);

		if (isNaN(birthDate.getTime())) {
			throw new ValidationError("Invalid date format");
		}

		const now = new Date();
		let age = now.getFullYear() - birthDate.getFullYear();

		const monthDiff = now.getMonth() - birthDate.getMonth();
		if (
			monthDiff < 0 ||
			(monthDiff === 0 && now.getDate() < birthDate.getDate())
		) {
			age = age - 1;
		}

		return age;
	},

	/**
	 * Validate image URL (to be expanded)
	 * @param {string} imageUrl - Image URL to validate
	 * @returns {string} - Validated image URL
	 */
	checkImageUrl(imageUrl) {
		if (!imageUrl) return "";

		// Basic URL validation
		try {
			new URL(imageUrl);

			// Check if it's an image URL (by extension)
			const validExtensions = [
				".jpg",
				".jpeg",
				".png",
				".gif",
				".webp",
				".svg",
			];
			const hasValidExtension = validExtensions.some((ext) =>
				imageUrl.toLowerCase().endsWith(ext)
			);

			// For Cloudinary and other image services without extensions
			const isImageService =
				imageUrl.includes("cloudinary.com") ||
				imageUrl.includes("imgur.com") ||
				imageUrl.includes("unsplash.com");

			if (!hasValidExtension && !isImageService) {
				console.warn("URL may not be an image:", imageUrl);
				// Still allow it, but log a warning
			}

			return this.sanitizeString(imageUrl);
		} catch (e) {
			throw new ValidationError("Invalid image URL format");
		}
	},

	/**
	 * Validate URL format
	 * @param {string} url - URL to validate
	 * @returns {string} - Validated URL
	 */
	checkUrl(url) {
		if (!url) return "";
		if (typeof url !== "string")
			throw new ValidationError("URL must be a string");

		url = url.trim();
		if (url.length === 0) return "";

		try {
			new URL(url);
			return this.sanitizeString(url);
		} catch (e) {
			throw new ValidationError("Invalid URL format");
		}
	},

	/**
	 * Get formatted current date
	 * @returns {string} - Current date in ISO format
	 */
	getDate() {
		let date = new Date();
		let year = date.getFullYear();
		let month = String(date.getMonth() + 1).padStart(2, "0");
		let day = String(date.getDate()).padStart(2, "0");
		let hours = String(date.getUTCHours()).padStart(2, "0");
		let minutes = String(date.getUTCMinutes()).padStart(2, "0");
		let seconds = String(date.getUTCSeconds()).padStart(2, "0");

		let currentDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;

		return currentDate;
	},

	/**
	 * Check if user is admin of a group
	 * @param {Object} userGroups - Group object
	 * @param {string} userId - User ID to check
	 * @returns {boolean} - True if user is admin
	 */
	isAdmin(userGroups, userId) {
		if (!userGroups) throw new ValidationError("Could not find group");
		if (!userGroups.members)
			throw new ValidationError("Group has no members");

		return userGroups.members[0] === userId;
	},

	/**
	 * Validate location
	 * @param {string} location - Location to validate
	 * @returns {string} - Validated location
	 */
	checkLocation(location) {
		location = this.checkString(location, "location");

		const validLocations = [
			"Edwin A. Stevens",
			"Library",
			"Gateway South",
			"Gateway North",
			"North Building",
			"Babbio",
			"ABS",
			"Burchard",
			"Carnegie",
			"Davidson",
			"Altorfer",
			"Kidde",
			"McLean",
			"Morton",
			"Nicoll",
			"Pierce",
			"Rocco",
			"TBD",
		];

		if (!validLocations.includes(location)) {
			throw new ValidationError("Invalid location");
		}

		return location;
	},

	/**
	 * Validate course format (e.g., CS-546 or CS 546)
	 * @param {string} course - Course to validate
	 * @returns {string} - Validated course
	 */
	checkCourse(course) {
		course = this.checkString(course, "course");

		if (/^[A-Za-z]{2,3}[-\s]?\d{3}$/.test(course)) {
			return course;
		} else {
			throw new ValidationError(
				"Course must be in following format: CS-546 or CS 546"
			);
		}
	},

	/**
	 * Validate time format (HH:MM)
	 * @param {string} time - Time to validate
	 * @returns {string} - Validated time
	 */
	checkTime(time) {
		time = this.checkString(time, "time");

		if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
			return time;
		} else {
			throw new ValidationError(
				"Invalid time format (must be HH:MM in 24-hour format)"
			);
		}
	},

	/**
	 * Check that end time is after start time
	 * @param {string} time1 - Start time
	 * @param {string} time2 - End time
	 * @returns {boolean} - True if valid
	 */
	checkTimes(time1, time2) {
		time1 = this.checkString(time1, "startTime");
		time2 = this.checkString(time2, "endTime");

		const convertToHHMM = (time) => {
			const [hours, minutes] = time.split(":");
			return parseInt(hours) * 100 + parseInt(minutes);
		};

		const timeNum1 = convertToHHMM(time1);
		const timeNum2 = convertToHHMM(time2);

		if (timeNum2 <= timeNum1) {
			throw new ValidationError("End time must be later than start time");
		}

		return true;
	},

	/**
	 * Validate group type
	 * @param {string} groupType - Group type to validate
	 * @returns {string} - Validated group type
	 */
	checkType(groupType) {
		groupType = this.checkString(groupType, "groupType");

		if (groupType !== "study-group" && groupType !== "project-group") {
			throw new ValidationError("Invalid group type");
		}

		return groupType;
	},

	/**
	 * Validate phone number format
	 * @param {string} phone - Phone number to validate
	 * @param {string} varName - Name of variable for error message
	 * @returns {string} - Validated phone number
	 */
	checkPhone(phone, varName = "Phone number") {
		if (!phone) throw new ValidationError(`${varName} is required`);
		if (typeof phone !== "string")
			throw new ValidationError(`${varName} must be a string`);

		// Remove all non-digit characters
		const digits = phone.replace(/\D/g, "");

		// Check if we have a valid number of digits (10-15)
		if (digits.length < 10 || digits.length > 15) {
			throw new ValidationError(
				`${varName} must have between 10 and 15 digits`
			);
		}

		// Format as XXX-XXX-XXXX for US numbers
		if (digits.length === 10) {
			return `${digits.substring(0, 3)}-${digits.substring(
				3,
				6
			)}-${digits.substring(6)}`;
		}

		// For international numbers, just return the digits
		return digits;
	},
};

export default exportedMethods;
