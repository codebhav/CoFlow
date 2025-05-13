import { users } from "../config/mongoCollections.js";
import * as admindata from "./admin.js";
import * as businessdata from "./business.js";
import Validation from "../helpers.js";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";

/**
 * Create a new user
 * @param {string} userName - Username
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @param {string} email - Email address
 * @param {string} hashedPassword - Pre-hashed password
 * @param {string} bio - User bio
 * @param {string} gender - User gender
 * @param {string} city - User city
 * @param {string} state - User state
 * @param {string} dob - Date of birth
 * @param {Array} courses - Array of courses
 * @param {Array} education - Array of education objects
 * @param {string} terms - Terms agreement
 * @param {string} privacy - Privacy policy agreement
 * @returns {Object} Created user
 */
async function createUser(
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
) {
	// Check required fields
	if (
		!userName ||
		!firstName ||
		!lastName ||
		!email ||
		!hashedPassword ||
		!terms ||
		!privacy
	) {
		throw new Error("Required fields missing");
	}

	try {
		// Process and validate all inputs
		userName = Validation.checkString(userName, "Username");
		firstName = Validation.checkString(
			firstName,
			"First name"
		).toLowerCase();
		lastName = Validation.checkString(lastName, "Last name").toLowerCase();
		email = Validation.checkEmail(email).toLowerCase();
		hashedPassword = Validation.checkString(
			hashedPassword,
			"Password hash"
		);

		bio = bio ? Validation.checkString(bio, "Bio") : "";
		gender = gender ? Validation.checkGender(gender, "Gender") : "";
		city = city ? Validation.checkString(city, "City") : "";
		state = state ? Validation.checkString(state, "State") : "";
		dob = dob ? Validation.checkDate(dob) : "";
		courses = courses ? Validation.checkStringArray(courses) : [];
		education = education ? Validation.checkEducation(education) : [];

		if (terms !== "on" || privacy !== "on") {
			throw new Error("You must agree to the terms and privacy policy");
		}

		// Check for existing users
		const userCollection = await users();

		// Case-insensitive check for existing username
		const findName = await userCollection.findOne({
			userName: { $regex: new RegExp(`^${userName}$`, "i") },
		});

		if (findName) throw new Error("Username already exists");

		// Case-insensitive check for existing email
		const findEmail = await userCollection.findOne({
			email: { $regex: new RegExp(`^${email}$`, "i") },
		});

		if (findEmail) throw new Error("Email already exists");

		// Create new user object
		const newUser = {
			userName: userName,
			firstName: firstName,
			lastName: lastName,
			email: email,
			hashedPassword: hashedPassword,
			bio: bio,
			gender: gender,
			state: state,
			city: city,
			age: dob !== "" ? Validation.getAge(dob) : "",
			dob: dob,
			courses: courses,
			education: education,
			terms: terms,
			privacy: privacy,
			profilePicture: "",
			rating: 0,
			badgeIds: [],
			schedule: [],
			notificationSettings: {},
			createdGroups: [],
			joinedGroups: [],
			pendingGroups: [],
			role: "user",
		};

		// Insert into database
		const insertInfo = await userCollection.insertOne(newUser);
		if (!insertInfo.insertedId)
			throw new Error("Failed to insert new user");

		return await findUserById(insertInfo.insertedId.toString());
	} catch (e) {
		throw new Error(`Error creating user: ${e.message}`);
	}
}

/**
 * Find a user by username (case insensitive)
 * @param {string} username - Username to find
 * @returns {Object|null} User object or null if not found
 */
async function findUserByUsername(username) {
	if (!username) throw new Error("You must provide a username to search for");
	username = Validation.checkString(username, "check username");

	const userCollection = await users();

	// Use case-insensitive search but maintain case in DB
	const findUser = await userCollection.findOne({
		userName: { $regex: new RegExp(`^${username}$`, "i") },
	});

	if (findUser === null) return null;

	findUser._id = findUser._id.toString();
	return findUser;
}

/**
 * Find a user by email (case insensitive)
 * @param {string} email - Email to find
 * @returns {Object|null} User object or null if not found
 */
async function findUserByEmail(email) {
	if (!email) throw new Error("You must provide an email to search for");
	email = Validation.checkEmail(email);

	const userCollection = await users();

	// Use case-insensitive search
	const findUser = await userCollection.findOne({
		email: { $regex: new RegExp(`^${email}$`, "i") },
	});

	if (findUser === null) return null;

	findUser._id = findUser._id.toString();
	return findUser;
}

/**
 * Find a user by ID
 * @param {string} userId - User ID to find
 * @returns {Object|null} User object or null if not found
 */
async function findUserById(userId) {
	if (!userId) throw new Error("You must provide a userId to search for");
	userId = Validation.checkId(userId);

	const userCollection = await users();
	const findUser = await userCollection.findOne({
		_id: new ObjectId(userId),
	});

	if (findUser === null) return null;

	findUser._id = findUser._id.toString();
	return findUser;
}

/**
 * Get all users
 * @returns {Array} Array of all users
 */
async function getAllUsers() {
	const userCollection = await users();
	const userList = await userCollection.find({}).toArray();

	userList.forEach((element) => {
		element._id = element._id.toString();
	});

	return userList;
}

/**
 * Update a user's profile
 * @param {string} lastUserName - Original username
 * @param {string} userName - New username
 * @param {string} firstName - New first name
 * @param {string} lastName - New last name
 * @param {string} email - New email
 * @param {string} bio - New bio
 * @param {string} gender - New gender
 * @param {string} state - New state
 * @param {string} city - New city
 * @param {string} dob - New date of birth
 * @param {Array} courses - New courses array
 * @param {Array} education - New education array
 * @param {string} profilePicture - New profile picture URL
 * @returns {Object} Updated user
 */
async function updateUserProfile(
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
) {
	if (!userName || !firstName || !lastName || !email || !lastUserName) {
		throw new Error("Basic info fields need to have valid values");
	}

	// Get original user data
	const originUserData = await findUserByUsername(lastUserName);
	if (!originUserData) {
		throw new Error("Original username not found");
	}

	const { _id, ...originUser } = originUserData;

	// Check if new username is already taken by someone else
	if (userName.toLowerCase() !== lastUserName.toLowerCase()) {
		const existingUsername = await findUserByUsername(userName);
		if (existingUsername) {
			throw new Error("Username already exists");
		}
	}

	// Check if new email is already taken by someone else
	if (email.toLowerCase() !== originUser.email.toLowerCase()) {
		const existingEmail = await findUserByEmail(email);
		if (existingEmail) {
			throw new Error("Email already registered");
		}
	}

	// Validate all inputs
	userName = Validation.checkString(userName, "Username");
	firstName = Validation.checkString(firstName, "First name").toLowerCase();
	lastName = Validation.checkString(lastName, "Last name").toLowerCase();
	email = Validation.checkEmail(email).toLowerCase();

	bio = bio ? Validation.checkString(bio, "Bio") : "";
	gender = gender ? Validation.checkGender(gender, "Gender") : "";
	city = city ? Validation.checkString(city, "City") : "";
	state = state ? Validation.checkString(state, "State") : "";
	dob = dob ? Validation.checkDate(dob) : "";
	courses = courses ? Validation.checkStringArray(courses) : [];
	education = education ? Validation.checkEducation(education) : [];
	profilePicture = profilePicture
		? Validation.checkImageUrl(profilePicture)
		: "";

	// Update user object
	originUser.userName = userName;
	originUser.firstName = firstName;
	originUser.lastName = lastName;
	originUser.email = email;
	originUser.bio = bio;
	originUser.gender = gender;
	originUser.city = city;
	originUser.state = state;

	if (dob) {
		originUser.dob = dob;
		originUser.age = Validation.getAge(dob);
	}

	originUser.courses = courses;
	originUser.education = education;

	if (profilePicture) {
		originUser.profilePicture = profilePicture;
	}

	// Update in database
	const userCollection = await users();
	const userId = originUserData._id.toString();

	const updatedUser = await userCollection.updateOne(
		{ _id: new ObjectId(userId) },
		{ $set: originUser }
	);

	if (!updatedUser.matchedCount && !updatedUser.modifiedCount) {
		throw new Error("Could not update user successfully");
	}

	return await findUserById(userId);
}

/**
 * Remove a user
 * @param {string} userId - ID of user to remove
 * @returns {boolean} True if successful
 */
async function removeUser(userId) {
	if (!userId) throw new Error("Need to provide userId");
	userId = Validation.checkId(userId);

	const userCollection = await users();
	const user = await findUserById(userId);

	if (user === null) throw new Error("No user with that id");

	const deletionInfo = await userCollection.deleteOne({
		_id: new ObjectId(userId),
	});

	if (deletionInfo.deletedCount === 0) {
		throw new Error(`Could not delete user with id of ${userId}`);
	}

	return true;
}

/**
 * Check login credentials and return user if valid
 * @param {string} userName - Username or email
 * @param {string} password - Plain text password
 * @returns {Object} User object if credentials are valid
 */
async function checkLogin(userName, password) {
	if (!userName || !password) throw new Error("All fields are required");

	userName = Validation.checkString(userName, "Username");
	password = Validation.checkString(password, "Password");

	// Find user in different collections based on role
	let resUser = null;

	// Try finding in regular users
	let findUser = await findUserByUsername(userName);

	// If not found by username, try email
	if (!findUser) {
		try {
			findUser = await findUserByEmail(userName);
		} catch (e) {
			// Not an email, continue with other checks
		}
	}

	if (findUser) {
		resUser = findUser;
	} else {
		// Try finding in admin users
		try {
			let findAdmin = await admindata.findAdminByadminName(userName);
			if (findAdmin) {
				resUser = findAdmin;
			}
		} catch (e) {
			// Not found in admin, continue
		}

		// Try finding in business users if still not found
		if (!resUser) {
			try {
				let findBusiness = await businessdata.findBuserByUsername(
					userName
				);
				if (findBusiness) {
					resUser = findBusiness;
				}
			} catch (e) {
				// Not found in business users
			}
		}
	}

	if (!resUser) throw new Error("Either username or password is incorrect");

	// Verify password
	try {
		const match = await bcrypt.compare(password, resUser.hashedPassword);
		if (!match) throw new Error("Either username or password is incorrect");

		return resUser;
	} catch (e) {
		throw new Error("Either username or password is incorrect");
	}
}

/**
 * Add a badge to a user
 * @param {string} userId - User ID
 * @param {string} badgeId - Badge ID
 * @returns {Object} Updated user
 */
export const addBadgeToUser = async (userId, badgeId) => {
	try {
		userId = Validation.checkId(userId, "User ID");
		badgeId = Validation.checkString(badgeId, "Badge ID");

		const usersCollection = await users();

		// Update user
		const updateResult = await usersCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{ $addToSet: { badgeIds: badgeId } }
		);

		if (!updateResult.modifiedCount && !updateResult.matchedCount) {
			throw new Error("Failed to add badge to user");
		}

		return await findUserById(userId);
	} catch (error) {
		console.error("Error adding badge to user:", error);
		throw new Error(`Failed to add badge to user: ${error.message}`);
	}
};

/**
 * Remove a badge from a user
 * @param {string} userId - User ID
 * @param {string} badgeId - Badge ID
 * @returns {Object} Updated user
 */
export const removeBadgeFromUser = async (userId, badgeId) => {
	try {
		userId = Validation.checkId(userId, "User ID");
		badgeId = Validation.checkString(badgeId, "Badge ID");

		const usersCollection = await users();

		// Update user
		const updateResult = await usersCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{ $pull: { badgeIds: badgeId } }
		);

		if (!updateResult.modifiedCount && !updateResult.matchedCount) {
			throw new Error("Failed to remove badge from user");
		}

		return await findUserById(userId);
	} catch (error) {
		console.error("Error removing badge from user:", error);
		throw new Error(`Failed to remove badge from user: ${error.message}`);
	}
};

/**
 * Get badges for user
 * @param {string} userId - User ID
 * @returns {Array} Array of badge IDs
 */
export const getUserBadgeIds = async (userId) => {
	try {
		userId = Validation.checkId(userId, "User ID");

		const usersCollection = await users();
		const user = await usersCollection.findOne(
			{ _id: new ObjectId(userId) },
			{ projection: { badgeIds: 1 } }
		);

		if (!user) {
			throw new NotFoundError("User not found");
		}

		return user.badgeIds || [];
	} catch (error) {
		console.error("Error getting user badge IDs:", error);
		throw new Error(`Failed to get user badge IDs: ${error.message}`);
	}
};

export {
	createUser,
	findUserByEmail,
	findUserByUsername,
	findUserById,
	getAllUsers,
	updateUserProfile,
	removeUser,
	checkLogin,
};
