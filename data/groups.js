import { groups } from "../config/mongoCollections.js";
import { users } from "../config/mongoCollections.js";
import * as scheduleModel from "../models/Schedule.js";
import { ObjectId } from "mongodb";
import Validation from "../helpers.js";
import {
	ValidationError,
	NotFoundError,
	ConflictError,
} from "../utils/error-utils.js";

/**
 * Create a new study group
 * @param {string} groupName - Name of the group
 * @param {string} description - Group description
 * @param {number} capacity - Maximum number of members
 * @param {string} location - Meeting location
 * @param {string} course - Course identifier (e.g., "CS-546")
 * @param {string} startTime - Start time (HH:MM format)
 * @param {string} endTime - End time (HH:MM format)
 * @param {string} meetingDate - Meeting date (YYYY-MM-DD format)
 * @param {string} groupType - Type of group (e.g., "study-group", "project-group")
 * @param {string} creatorId - User ID of group creator
 * @param {Array} tags - Array of tags for the group
 * @returns {Object} Created group object
 */
export const createGroup = async (
	groupName,
	description,
	capacity,
	location,
	course,
	startTime,
	endTime,
	meetingDate,
	groupType,
	creatorId,
	tags
) => {
	try {
		// Validate required fields
		if (
			!groupName ||
			!description ||
			!capacity ||
			!location ||
			!course ||
			!startTime ||
			!endTime ||
			!meetingDate ||
			!groupType ||
			!creatorId
		) {
			throw new ValidationError("All required fields must be provided");
		}

		// Validate and sanitize inputs
		groupName = Validation.checkString(groupName, "Group name");
		description = Validation.checkString(description, "Description");

		// Validate capacity is a number between 2 and 15
		if (typeof capacity === "string") {
			capacity = parseInt(capacity);
		}

		if (!Number.isInteger(capacity) || capacity < 2 || capacity > 15) {
			throw new ValidationError(
				"Capacity must be a number between 2 and 15"
			);
		}

		location = Validation.checkLocation(location);
		course = Validation.checkCourse(course);
		startTime = Validation.checkTime(startTime);
		endTime = Validation.checkTime(endTime);

		// Ensure end time is after start time
		Validation.checkTimes(startTime, endTime);

		meetingDate = Validation.checkDate(meetingDate);
		groupType = Validation.checkType(groupType);
		creatorId = Validation.checkId(creatorId, "Creator ID");

		// Validate tags array
		if (!tags || !Array.isArray(tags)) {
			tags = [];
		} else {
			tags = Validation.checkStringArray(tags, "Tags");
		}

		// Check if the meeting date is in the future
		const today = new Date();
		const meetingDateObj = new Date(meetingDate);

		if (
			meetingDateObj < today &&
			meetingDateObj.toDateString() !== today.toDateString()
		) {
			throw new ValidationError("Meeting date cannot be in the past");
		}

		// Check if the creator exists
		const usersCollection = await users();
		const creator = await usersCollection.findOne({
			_id: new ObjectId(creatorId),
		});

		if (!creator) {
			throw new NotFoundError("Creator not found");
		}

		// Check for schedule conflicts
		const userGroups = creator.createdGroups.concat(
			creator.joinedGroups || []
		);

		if (userGroups.length > 0) {
			const groupsCollection = await groups();
			const existingGroups = await groupsCollection
				.find({
					_id: { $in: userGroups.map((id) => new ObjectId(id)) },
				})
				.toArray();

			for (const group of existingGroups) {
				if (group.meetingDate === meetingDate) {
					// Convert times to minutes for easier comparison
					const convertToMinutes = (time) => {
						const [hours, minutes] = time.split(":").map(Number);
						return hours * 60 + minutes;
					};

					const newStartMinutes = convertToMinutes(startTime);
					const newEndMinutes = convertToMinutes(endTime);
					const existingStartMinutes = convertToMinutes(
						group.startTime
					);
					const existingEndMinutes = convertToMinutes(group.endTime);

					// Check for overlap
					if (
						(newStartMinutes >= existingStartMinutes &&
							newStartMinutes < existingEndMinutes) ||
						(newEndMinutes > existingStartMinutes &&
							newEndMinutes <= existingEndMinutes) ||
						(newStartMinutes <= existingStartMinutes &&
							newEndMinutes >= existingEndMinutes)
					) {
						throw new ConflictError(
							`Schedule conflict with group "${group.groupName}"`
						);
					}
				}
			}
		}

		// Create group object
		const currentDate = Validation.getDate();

		const newGroup = {
			groupName,
			course,
			groupType,
			meetingDate,
			startTime,
			endTime,
			location,
			isFull: false,
			description,
			capacity,
			members: [creatorId],
			pendingMembers: [],
			rejectedMembers: [],
			tags,
			createdAt: currentDate,
			updatedAt: currentDate,
		};

		// Save group to database
		const groupsCollection = await groups();
		const insertInfo = await groupsCollection.insertOne(newGroup);

		if (!insertInfo.insertedId) {
			throw new Error("Failed to create group");
		}

		// Update user's created groups
		const groupId = insertInfo.insertedId.toString();

		await usersCollection.updateOne(
			{ _id: new ObjectId(creatorId) },
			{ $push: { createdGroups: groupId } }
		);

		// Add to user's schedule
		await addGroupToUserSchedule(
			creatorId,
			groupId,
			meetingDate,
			startTime,
			endTime
		);

		// Return created group
		const createdGroup = await getGroupById(groupId);
		return createdGroup;
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError ||
			error instanceof ConflictError
		) {
			throw error;
		}
		console.error("Error creating group:", error);
		throw new Error(`Failed to create group: ${error.message}`);
	}
};

/**
 * Add a group to a user's schedule
 * @param {string} userId - User ID
 * @param {string} groupId - Group ID
 * @param {string} meetingDate - Meeting date
 * @param {string} startTime - Start time
 * @param {string} endTime - End time
 */
export const addGroupToUserSchedule = async (
	userId,
	groupId,
	meetingDate,
	startTime,
	endTime
) => {
	try {
		// Add to user's schedule collection
		await scheduleModel.addEventToSchedule(
			userId,
			groupId,
			meetingDate,
			startTime,
			endTime
		);

		// Also update the user's schedule array
		const usersCollection = await users();
		await usersCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{
				$push: {
					schedule: {
						groupId: groupId,
						meetingDate: meetingDate,
						startTime: startTime,
						endTime: endTime,
					},
				},
			}
		);
	} catch (error) {
		console.error("Error adding group to user schedule:", error);
		throw error;
	}
};

/**
 * Remove a group from a user's schedule
 * @param {string} userId - User ID
 * @param {string} groupId - Group ID
 */
export const removeGroupFromUserSchedule = async (userId, groupId) => {
	try {
		// Remove from schedule collection
		await scheduleModel.removeEventFromSchedule(userId, groupId);

		// Also update the user's schedule array
		const usersCollection = await users();
		await usersCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{
				$pull: {
					schedule: { groupId: groupId },
				},
			}
		);
	} catch (error) {
		console.error("Error removing group from user schedule:", error);
		throw error;
	}
};

/**
 * Get a group by its ID
 * @param {string} groupId - Group ID
 * @returns {Object} Group object
 */
export const getGroupById = async (groupId) => {
	try {
		if (!groupId) {
			throw new ValidationError("Group ID is required");
		}

		if (typeof groupId !== "string") {
			throw new ValidationError("Group ID must be a string");
		}

		groupId = groupId.trim();
		if (groupId.length === 0) {
			throw new ValidationError("Group ID cannot be empty");
		}

		if (!ObjectId.isValid(groupId)) {
			throw new ValidationError("Invalid group ID format");
		}

		const groupsCollection = await groups();
		const group = await groupsCollection.findOne({
			_id: new ObjectId(groupId),
		});

		if (!group) {
			throw new NotFoundError("Group not found");
		}

		// Convert ObjectId to string
		group._id = group._id.toString();

		// Convert member IDs to strings
		if (group.members) {
			group.members = group.members.map((id) => id.toString());
		}
		if (group.pendingMembers) {
			group.pendingMembers = group.pendingMembers.map((id) =>
				id.toString()
			);
		}
		if (group.rejectedMembers) {
			group.rejectedMembers = group.rejectedMembers.map((id) =>
				id.toString()
			);
		}

		return group;
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError
		) {
			throw error;
		}
		console.error("Error getting group by ID:", error);
		throw new Error(`Failed to get group: ${error.message}`);
	}
};

/**
 * Update a group's details
 * @param {string} groupId - Group ID
 * @param {Object} updates - Object containing fields to update
 * @param {string} userId - ID of user making the update (must be admin)
 * @returns {Object} Updated group
 */
export const updateGroup = async (groupId, updates, userId) => {
	try {
		groupId = Validation.checkId(groupId, "Group ID");
		userId = Validation.checkId(userId, "User ID");

		// Get current group data
		const currentGroup = await getGroupById(groupId);

		// Check if user is the group admin
		if (currentGroup.members[0] !== userId) {
			throw new ValidationError(
				"Only the group admin can update the group"
			);
		}

		// Prepare update object
		const updateObj = {};

		// Validate and add fields to update object
		if (updates.groupName) {
			updateObj.groupName = Validation.checkString(
				updates.groupName,
				"Group name"
			);
		}

		if (updates.description) {
			updateObj.description = Validation.checkString(
				updates.description,
				"Description"
			);
		}

		if (updates.capacity) {
			let capacity = updates.capacity;
			if (typeof capacity === "string") {
				capacity = parseInt(capacity);
			}

			if (!Number.isInteger(capacity) || capacity < 2 || capacity > 15) {
				throw new ValidationError(
					"Capacity must be a number between 2 and 15"
				);
			}

			// Make sure new capacity is not less than current member count
			if (capacity < currentGroup.members.length) {
				throw new ValidationError(
					"New capacity cannot be less than current member count"
				);
			}

			updateObj.capacity = capacity;

			// Update isFull flag
			updateObj.isFull = currentGroup.members.length >= capacity;
		}

		if (updates.location) {
			updateObj.location = Validation.checkLocation(updates.location);
		}

		if (updates.course) {
			updateObj.course = Validation.checkCourse(updates.course);
		}

		// For time/date updates, we need to check schedule conflicts
		let timeUpdated = false;
		let newMeetingDate = currentGroup.meetingDate;
		let newStartTime = currentGroup.startTime;
		let newEndTime = currentGroup.endTime;

		if (updates.meetingDate) {
			newMeetingDate = Validation.checkDate(updates.meetingDate);
			updateObj.meetingDate = newMeetingDate;
			timeUpdated = true;

			// Check if meeting date is in the future
			const today = new Date();
			const meetingDateObj = new Date(newMeetingDate);

			if (
				meetingDateObj < today &&
				meetingDateObj.toDateString() !== today.toDateString()
			) {
				throw new ValidationError("Meeting date cannot be in the past");
			}
		}

		if (updates.startTime) {
			newStartTime = Validation.checkTime(updates.startTime);
			updateObj.startTime = newStartTime;
			timeUpdated = true;
		}

		if (updates.endTime) {
			newEndTime = Validation.checkTime(updates.endTime);
			updateObj.endTime = newEndTime;
			timeUpdated = true;
		}

		if (updates.startTime || updates.endTime) {
			// Check that end time is after start time
			Validation.checkTimes(newStartTime, newEndTime);
		}

		if (updates.groupType) {
			updateObj.groupType = Validation.checkType(updates.groupType);
		}

		if (updates.tags) {
			if (!Array.isArray(updates.tags)) {
				throw new ValidationError("Tags must be an array");
			}
			updateObj.tags = Validation.checkStringArray(updates.tags, "Tags");
		}

		// If time or date was updated, check for schedule conflicts for all members
		if (timeUpdated) {
			await checkScheduleConflictsForMembers(
				currentGroup.members,
				groupId,
				newMeetingDate,
				newStartTime,
				newEndTime
			);

			// Update all members' schedules
			await updateMembersSchedules(
				currentGroup.members,
				groupId,
				newMeetingDate,
				newStartTime,
				newEndTime
			);
		}

		// Set update timestamp
		updateObj.updatedAt = Validation.getDate();

		// Update the group
		const groupsCollection = await groups();
		const updateResult = await groupsCollection.updateOne(
			{ _id: new ObjectId(groupId) },
			{ $set: updateObj }
		);

		if (updateResult.modifiedCount === 0) {
			throw new Error("Failed to update group");
		}

		// Return updated group
		return await getGroupById(groupId);
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError ||
			error instanceof ConflictError
		) {
			throw error;
		}
		console.error("Error updating group:", error);
		throw new Error(`Failed to update group: ${error.message}`);
	}
};

/**
 * Check for schedule conflicts for a list of users
 * @param {Array} memberIds - Array of user IDs
 * @param {string} currentGroupId - Current group ID (to exclude from checks)
 * @param {string} meetingDate - Meeting date
 * @param {string} startTime - Start time
 * @param {string} endTime - End time
 * @returns {boolean} True if no conflicts
 */
export const checkScheduleConflictsForMembers = async (
	memberIds,
	currentGroupId,
	meetingDate,
	startTime,
	endTime
) => {
	try {
		const usersCollection = await users();
		const groupsCollection = await groups();

		// Convert times to minutes for easier comparison
		const convertToMinutes = (time) => {
			const [hours, minutes] = time.split(":").map(Number);
			return hours * 60 + minutes;
		};

		const newStartMinutes = convertToMinutes(startTime);
		const newEndMinutes = convertToMinutes(endTime);

		// Check conflicts for each member
		for (const memberId of memberIds) {
			const user = await usersCollection.findOne({
				_id: new ObjectId(memberId),
			});

			if (!user) {
				continue; // Skip if user not found
			}

			// Get user name for better error messages
			const userName = user.userName || "User";

			// Combine created and joined groups
			const userGroups = [
				...(user.createdGroups || []),
				...(user.joinedGroups || []),
			].filter((id) => id !== currentGroupId); // Skip the current group

			if (userGroups.length > 0) {
				const existingGroups = await groupsCollection
					.find({
						_id: {
							$in: userGroups.map((id) => new ObjectId(id)),
						},
					})
					.toArray();

				for (const group of existingGroups) {
					if (group.meetingDate === meetingDate) {
						const existingStartMinutes = convertToMinutes(
							group.startTime
						);
						const existingEndMinutes = convertToMinutes(
							group.endTime
						);

						// Check for overlap: we have a conflict if either:
						// 1. New start time is during an existing meeting
						// 2. New end time is during an existing meeting
						// 3. New meeting completely encompasses an existing meeting
						if (
							(newStartMinutes >= existingStartMinutes &&
								newStartMinutes < existingEndMinutes) ||
							(newEndMinutes > existingStartMinutes &&
								newEndMinutes <= existingEndMinutes) ||
							(newStartMinutes <= existingStartMinutes &&
								newEndMinutes >= existingEndMinutes)
						) {
							throw new ConflictError(
								`Schedule conflict with group "${group.groupName}" for user ${userName} (${meetingDate} ${startTime}-${endTime} conflicts with ${group.startTime}-${group.endTime})`
							);
						}
					}
				}
			}
		}

		return true;
	} catch (error) {
		if (error instanceof ConflictError) {
			throw error;
		}
		console.error("Error checking schedule conflicts:", error);
		throw new Error(`Failed to check schedule conflicts: ${error.message}`);
	}
};

/**
 * Update schedules for all members of a group
 * @param {Array} memberIds - Array of user IDs
 * @param {string} groupId - Group ID
 * @param {string} meetingDate - New meeting date
 * @param {string} startTime - New start time
 * @param {string} endTime - New end time
 */
export const updateMembersSchedules = async (
	memberIds,
	groupId,
	meetingDate,
	startTime,
	endTime
) => {
	try {
		const usersCollection = await users();

		for (const memberId of memberIds) {
			// First remove the old schedule entry
			await usersCollection.updateOne(
				{ _id: new ObjectId(memberId) },
				{ $pull: { schedule: { groupId: groupId } } }
			);

			// Then add the new one
			await usersCollection.updateOne(
				{ _id: new ObjectId(memberId) },
				{
					$push: {
						schedule: {
							groupId: groupId,
							meetingDate: meetingDate,
							startTime: startTime,
							endTime: endTime,
						},
					},
				}
			);
		}
	} catch (error) {
		console.error("Error updating members schedules:", error);
		// Don't throw here to prevent breaking group updates
	}
};

/**
 * Delete a group
 * @param {string} groupId - Group ID
 * @param {string} userId - ID of user making the request (must be admin)
 * @returns {Object} Result of deletion
 */
export const deleteGroup = async (groupId, userId) => {
	try {
		groupId = Validation.checkId(groupId, "Group ID");
		userId = Validation.checkId(userId, "User ID");

		// Get group data
		const group = await getGroupById(groupId);

		// Check if user is the group admin
		if (group.members[0] !== userId) {
			throw new ValidationError(
				"Only the group admin can delete the group"
			);
		}

		const usersCollection = await users();
		const groupsCollection = await groups();

		// Remove group from all members' createdGroups, joinedGroups, and schedule
		for (const memberId of group.members) {
			await usersCollection.updateOne(
				{ _id: new ObjectId(memberId) },
				{
					$pull: {
						createdGroups: groupId,
						joinedGroups: groupId,
						schedule: { groupId: groupId },
					},
				}
			);
		}

		// Remove group from all pending members' pendingGroups
		for (const memberId of group.pendingMembers) {
			await usersCollection.updateOne(
				{ _id: new ObjectId(memberId) },
				{ $pull: { pendingGroups: groupId } }
			);
		}

		// Delete the group
		const deleteResult = await groupsCollection.deleteOne({
			_id: new ObjectId(groupId),
		});

		if (deleteResult.deletedCount === 0) {
			throw new Error("Failed to delete group");
		}

		return {
			deleted: true,
			groupId: groupId,
			message: "Group successfully deleted",
		};
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError
		) {
			throw error;
		}
		console.error("Error deleting group:", error);
		throw new Error(`Failed to delete group: ${error.message}`);
	}
};

/**
 * Get all groups (with filtering options)
 * @param {Object} filters - Filters to apply (optional)
 * @returns {Array} Array of groups matching filters
 */
export const getAllGroups = async (filters = {}) => {
	try {
		const groupsCollection = await groups();
		let query = {};

		// Apply filters if provided
		if (filters.course) {
			query.course = filters.course;
		}

		if (filters.groupType) {
			query.groupType = filters.groupType;
		}

		if (filters.location) {
			query.location = filters.location;
		}

		if (filters.meetingDate) {
			query.meetingDate = filters.meetingDate;
		}

		if (
			filters.tags &&
			Array.isArray(filters.tags) &&
			filters.tags.length > 0
		) {
			query.tags = { $in: filters.tags };
		}

		// Only show non-full groups by default
		if (filters.showFull !== true) {
			query.isFull = false;
		}

		// Only show future or today's groups by default
		if (filters.showPast !== true) {
			const today = new Date();
			const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
			query.meetingDate = { $gte: todayStr };
		}

		// Define sort order
		const sortField = filters.sortBy || "meetingDate";
		const sortOrder = filters.sortDesc ? -1 : 1;
		const sort = { [sortField]: sortOrder };

		const allGroups = await groupsCollection
			.find(query)
			.sort(sort)
			.toArray();

		// Convert ObjectIds to strings
		allGroups.forEach((group) => {
			group._id = group._id.toString();
		});

		return allGroups;
	} catch (error) {
		console.error("Error getting all groups:", error);
		throw new Error(`Failed to get groups: ${error.message}`);
	}
};

/**
 * Search for groups by keywords
 * @param {string} query - Search query
 * @param {string} userId - User ID for role assignment
 * @param {Object} filters - Search filters
 * @returns {Array} Array of matching groups with user roles
 */
export const searchGroups = async (query, userId, filters = {}) => {
	try {
		if (!query || typeof query !== "string") {
			query = "";
		}

		query = query.trim();

		// Get all groups with filters
		const allGroups = await getAllGroups(filters);

		// Filter by query if provided
		let filteredGroups = allGroups;

		if (query.length > 0) {
			const queryLower = query.toLowerCase();
			filteredGroups = allGroups.filter((group) => {
				// Search in group name, course, description, and tags
				return (
					group.groupName.toLowerCase().includes(queryLower) ||
					group.course.toLowerCase().includes(queryLower) ||
					group.description.toLowerCase().includes(queryLower) ||
					group.tags.some((tag) =>
						tag.toLowerCase().includes(queryLower)
					)
				);
			});
		}

		// Assign user role in each group
		if (userId) {
			filteredGroups = await assignUserRoles(filteredGroups, userId);
		}

		return filteredGroups;
	} catch (error) {
		console.error("Error searching groups:", error);
		throw new Error(`Failed to search groups: ${error.message}`);
	}
};

/**
 * Assign user roles in groups
 * @param {Array} groups - Array of groups
 * @param {string} userId - User ID
 * @returns {Array} Groups with user roles assigned
 */
export const assignUserRoles = async (groups, userId) => {
	if (!userId) return groups;

	return groups.map((group) => {
		let userRole = "noval"; // Default role

		// Check if user is a member (first member is admin)
		const memberIndex = group.members.indexOf(userId);

		if (memberIndex === 0) {
			userRole = "admin";
		} else if (memberIndex > 0) {
			userRole = "member";
		}
		// Check if user has a pending request
		else if (
			group.pendingMembers &&
			group.pendingMembers.includes(userId)
		) {
			userRole = "pending";
		}

		return {
			...group,
			userRole,
		};
	});
};

/**
 * Get groups where user is a member or admin
 * @param {string} userId - User ID
 * @returns {Array} Groups where user is a member or admin
 */
export const getGroupsForMember = async (userId) => {
	try {
		userId = Validation.checkId(userId, "User ID");

		const usersCollection = await users();
		const user = await usersCollection.findOne({
			_id: new ObjectId(userId),
		});

		if (!user) {
			throw new NotFoundError("User not found");
		}

		return user.createdGroups || [];
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError
		) {
			throw error;
		}
		console.error("Error getting groups for member:", error);
		throw new Error(`Failed to get groups: ${error.message}`);
	}
};

/**
 * Get groups created by user
 * @param {string} userId - User ID
 * @returns {Array} Groups created by user
 */
export const getGroupDataForMember = async (userId) => {
	try {
		// Validate user ID
		userId = Validation.checkId(userId, "User ID");

		// Get user's created groups
		const usersCollection = await users();
		const user = await usersCollection.findOne({
			_id: new ObjectId(userId),
		});

		if (!user) {
			throw new NotFoundError("User not found");
		}

		// Get groups created by user
		const groupsCollection = await groups();
		const createdGroups = await groupsCollection
			.find({
				members: userId,
				"members.0": userId, // First member is the creator
			})
			.toArray();

		return createdGroups;
	} catch (error) {
		throw error;
	}
};

/**
 * Get groups joined by user
 * @param {string} userId - User ID
 * @returns {Array} Groups joined by user
 */
export const getJoinedGroupsForMember = async (userId) => {
	try {
		userId = Validation.checkId(userId, "User ID");

		const usersCollection = await users();
		const user = await usersCollection.findOne({
			_id: new ObjectId(userId),
		});

		if (!user) {
			throw new NotFoundError("User not found");
		}

		return user.joinedGroups || [];
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError
		) {
			throw error;
		}
		console.error("Error getting joined groups for member:", error);
		throw new Error(`Failed to get joined groups: ${error.message}`);
	}
};

/**
 * Get data for groups joined by user
 * @param {string} userId - User ID
 * @returns {Array} Data for groups joined by user
 */
export const getJoinedGroupDataForMember = async (userId) => {
	try {
		// Validate user ID
		userId = Validation.checkId(userId, "User ID");

		// Get groups joined by user (excluding created groups)
		const groupsCollection = await groups();
		const joinedGroups = await groupsCollection
			.find({
				members: userId,
				"members.0": { $ne: userId }, // Exclude groups where user is creator
			})
			.toArray();

		return joinedGroups;
	} catch (error) {
		throw error;
	}
};

/**
 * Get groups where user has pending join requests
 * @param {string} userId - User ID
 * @returns {Array} Groups where user has pending requests
 */
export const getPendingGroupsForMember = async (userId) => {
	try {
		userId = Validation.checkId(userId, "User ID");

		const usersCollection = await users();
		const user = await usersCollection.findOne({
			_id: new ObjectId(userId),
		});

		if (!user) {
			throw new NotFoundError("User not found");
		}

		return user.pendingGroups || [];
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError
		) {
			throw error;
		}
		console.error("Error getting pending groups for member:", error);
		throw new Error(`Failed to get pending groups: ${error.message}`);
	}
};

/**
 * Get data for groups where user has pending join requests
 * @param {string} userId - User ID
 * @returns {Array} Data for groups with pending requests
 */
export const getPendingGroupDataForMember = async (userId) => {
	try {
		// Validate user ID
		userId = Validation.checkId(userId, "User ID");

		// Get groups where user has pending requests
		const groupsCollection = await groups();
		const pendingGroups = await groupsCollection
			.find({
				pendingMembers: userId,
			})
			.toArray();

		return pendingGroups;
	} catch (error) {
		throw error;
	}
};

/**
 * Request to join a group
 * @param {string} userId - User ID
 * @param {string} groupId - Group ID
 * @returns {Object} Result of the request
 */
export const requestToJoin = async (userId, groupId) => {
	try {
		userId = Validation.checkId(userId, "User ID");
		groupId = Validation.checkId(groupId, "Group ID");

		// Get group data
		const group = await getGroupById(groupId);

		// Check if group is full
		if (group.isFull) {
			throw new ValidationError("This group is full");
		}

		// Check if user is already a member
		if (group.members.includes(userId)) {
			throw new ValidationError("You are already a member of this group");
		}

		// Check if user already has a pending request
		if (group.pendingMembers.includes(userId)) {
			throw new ValidationError(
				"You already have a pending request to join this group"
			);
		}

		// Check for schedule conflicts
		const groupsCollection = await groups();
		const usersCollection = await users();

		const user = await usersCollection.findOne({
			_id: new ObjectId(userId),
		});
		if (!user) {
			throw new NotFoundError("User not found");
		}

		// Check conflicts in user's schedule
		const userGroups = user.createdGroups.concat(user.joinedGroups || []);

		if (userGroups.length > 0) {
			const existingGroups = await groupsCollection
				.find({
					_id: { $in: userGroups.map((id) => new ObjectId(id)) },
				})
				.toArray();

			for (const existingGroup of existingGroups) {
				if (existingGroup.meetingDate === group.meetingDate) {
					// Convert times to minutes for easier comparison
					const convertToMinutes = (time) => {
						const [hours, minutes] = time.split(":").map(Number);
						return hours * 60 + minutes;
					};

					const newStartMinutes = convertToMinutes(group.startTime);
					const newEndMinutes = convertToMinutes(group.endTime);
					const existingStartMinutes = convertToMinutes(
						existingGroup.startTime
					);
					const existingEndMinutes = convertToMinutes(
						existingGroup.endTime
					);

					// Check for overlap
					if (
						(newStartMinutes >= existingStartMinutes &&
							newStartMinutes < existingEndMinutes) ||
						(newEndMinutes > existingStartMinutes &&
							newEndMinutes <= existingEndMinutes) ||
						(newStartMinutes <= existingStartMinutes &&
							newEndMinutes >= existingEndMinutes)
					) {
						throw new ConflictError(
							`Schedule conflict with your group "${existingGroup.groupName}"`
						);
					}
				}
			}
		}

		// Add user to pending members
		const updateResult = await groupsCollection.updateOne(
			{ _id: new ObjectId(groupId) },
			{ $push: { pendingMembers: userId } }
		);

		if (updateResult.modifiedCount === 0) {
			throw new Error("Failed to add user to pending members");
		}

		// Add group to user's pending groups
		await usersCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{ $push: { pendingGroups: groupId } }
		);

		return {
			success: true,
			message: "Join request sent successfully",
		};
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError ||
			error instanceof ConflictError
		) {
			throw error;
		}
		console.error("Error requesting to join group:", error);
		throw new Error(`Failed to request joining group: ${error.message}`);
	}
};

/**
 * Cancel a join request
 * @param {string} userId - User ID
 * @param {string} groupId - Group ID
 * @returns {Object} Result of cancellation
 */
export const cancelRequest = async (userId, groupId) => {
	try {
		userId = Validation.checkId(userId, "User ID");
		groupId = Validation.checkId(groupId, "Group ID");

		const groupsCollection = await groups();
		const usersCollection = await users();

		// Remove user from pending members
		const updateResult = await groupsCollection.updateOne(
			{ _id: new ObjectId(groupId) },
			{ $pull: { pendingMembers: userId } }
		);

		// Remove group from user's pending groups
		await usersCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{ $pull: { pendingGroups: groupId } }
		);

		return {
			success: true,
			message: "Join request cancelled successfully",
		};
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError
		) {
			throw error;
		}
		console.error("Error cancelling join request:", error);
		throw new Error(`Failed to cancel join request: ${error.message}`);
	}
};

/**
 * Approve a user's request to join a group
 * @param {string} adminId - Admin user ID
 * @param {string} userId - User ID to approve
 * @param {string} groupId - Group ID
 * @returns {Object} Result of approval
 */
export const approveUser = async (adminId, userId, groupId) => {
	try {
		adminId = Validation.checkId(adminId, "Admin ID");
		userId = Validation.checkId(userId, "User ID");
		groupId = Validation.checkId(groupId, "Group ID");

		// Get group data
		const group = await getGroupById(groupId);

		// Check if admin is the group admin
		if (group.members[0] !== adminId) {
			throw new ValidationError(
				"Only the group admin can approve join requests"
			);
		}

		// Check if user has a pending request
		if (!group.pendingMembers.includes(userId)) {
			throw new ValidationError("User does not have a pending request");
		}

		// Check if group is full
		if (group.members.length >= group.capacity) {
			throw new ValidationError("This group is now full");
		}

		const groupsCollection = await groups();
		const usersCollection = await users();

		// Move user from pendingMembers to members
		const updateResult = await groupsCollection.updateOne(
			{ _id: new ObjectId(groupId) },
			{
				$pull: { pendingMembers: userId },
				$push: { members: userId },
				$set: { isFull: group.members.length + 1 >= group.capacity },
			}
		);

		if (updateResult.modifiedCount === 0) {
			throw new Error("Failed to approve user");
		}

		// Move group from pendingGroups to joinedGroups in user document
		await usersCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{
				$pull: { pendingGroups: groupId },
				$push: { joinedGroups: groupId },
			}
		);

		// Add to user's schedule
		await addGroupToUserSchedule(
			userId,
			groupId,
			group.meetingDate,
			group.startTime,
			group.endTime
		);

		return {
			success: true,
			message: "User approved successfully",
		};
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError
		) {
			throw error;
		}
		console.error("Error approving user:", error);
		throw new Error(`Failed to approve user: ${error.message}`);
	}
};

/**
 * Reject a user's request to join a group
 * @param {string} adminId - Admin user ID
 * @param {string} userId - User ID to reject
 * @param {string} groupId - Group ID
 * @returns {Object} Result of rejection
 */
export const rejectUser = async (adminId, userId, groupId) => {
	try {
		adminId = Validation.checkId(adminId, "Admin ID");
		userId = Validation.checkId(userId, "User ID");
		groupId = Validation.checkId(groupId, "Group ID");

		// Get group data
		const group = await getGroupById(groupId);

		// Check if admin is the group admin
		if (group.members[0] !== adminId) {
			throw new ValidationError(
				"Only the group admin can reject join requests"
			);
		}

		// Check if user has a pending request
		if (!group.pendingMembers.includes(userId)) {
			throw new ValidationError("User does not have a pending request");
		}

		const groupsCollection = await groups();
		const usersCollection = await users();

		// Remove user from pendingMembers, add to rejectedMembers
		const updateResult = await groupsCollection.updateOne(
			{ _id: new ObjectId(groupId) },
			{
				$pull: { pendingMembers: userId },
				$push: { rejectedMembers: userId },
			}
		);

		if (updateResult.modifiedCount === 0) {
			throw new Error("Failed to reject user");
		}

		// Remove group from user's pendingGroups
		await usersCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{ $pull: { pendingGroups: groupId } }
		);

		return {
			success: true,
			message: "User rejected successfully",
		};
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError
		) {
			throw error;
		}
		console.error("Error rejecting user:", error);
		throw new Error(`Failed to reject user: ${error.message}`);
	}
};

/**
 * Remove a user from a group
 * @param {string} adminId - Admin user ID
 * @param {string} userId - User ID to remove
 * @param {string} groupId - Group ID
 * @returns {Object} Result of removal
 */
export const removeUser = async (adminId, userId, groupId) => {
	try {
		adminId = Validation.checkId(adminId, "Admin ID");
		userId = Validation.checkId(userId, "User ID");
		groupId = Validation.checkId(groupId, "Group ID");

		// Get group data
		const group = await getGroupById(groupId);

		// Check if admin is the group admin
		if (group.members[0] !== adminId) {
			throw new ValidationError("Only the group admin can remove users");
		}

		// Check if user is a member (and not the admin)
		if (!group.members.includes(userId) || userId === adminId) {
			throw new ValidationError("Cannot remove this user");
		}

		const groupsCollection = await groups();
		const usersCollection = await users();

		// Remove user from members
		const updateResult = await groupsCollection.updateOne(
			{ _id: new ObjectId(groupId) },
			{
				$pull: { members: userId },
				$set: { isFull: false }, // Group can't be full after removing a member
			}
		);

		if (updateResult.modifiedCount === 0) {
			throw new Error("Failed to remove user");
		}

		// Remove group from user's joinedGroups and schedule
		await usersCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{
				$pull: {
					joinedGroups: groupId,
					schedule: { groupId: groupId },
				},
			}
		);

		return {
			success: true,
			message: "User removed successfully",
		};
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError
		) {
			throw error;
		}
		console.error("Error removing user:", error);
		throw new Error(`Failed to remove user: ${error.message}`);
	}
};

/**
 * Leave a group
 * @param {string} userId - User ID
 * @param {string} groupId - Group ID
 * @returns {Object} Result of leaving
 */
export const leaveGroup = async (userId, groupId) => {
	try {
		userId = Validation.checkId(userId, "User ID");
		groupId = Validation.checkId(groupId, "Group ID");

		// Get group data
		const group = await getGroupById(groupId);

		// Check if user is a member
		if (!group.members.includes(userId)) {
			throw new ValidationError("You are not a member of this group");
		}

		// Check if user is the admin (can't leave if admin)
		if (group.members[0] === userId) {
			throw new ValidationError(
				"As the admin, you cannot leave the group. You must delete it or transfer ownership."
			);
		}

		const groupsCollection = await groups();
		const usersCollection = await users();

		// Remove user from members
		const updateResult = await groupsCollection.updateOne(
			{ _id: new ObjectId(groupId) },
			{
				$pull: { members: userId },
				$set: { isFull: false }, // Group can't be full after removing a member
			}
		);

		if (updateResult.modifiedCount === 0) {
			throw new Error("Failed to leave group");
		}

		// Remove group from user's joinedGroups and schedule
		await usersCollection.updateOne(
			{ _id: new ObjectId(userId) },
			{
				$pull: {
					joinedGroups: groupId,
				},
			}
		);

		// Remove from schedule
		await removeGroupFromUserSchedule(userId, groupId);

		return {
			success: true,
			message: "Left group successfully",
		};
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError
		) {
			throw error;
		}
		console.error("Error leaving group:", error);
		throw new Error(`Failed to leave group: ${error.message}`);
	}
};

/**
 * Get pending users for a group with additional user data
 * @param {string} groupId - Group ID
 * @param {string} adminId - Admin user ID
 * @returns {Array} Array of pending users with details
 */
export const getPendingUsersForGroup = async (groupId, adminId) => {
	try {
		groupId = Validation.checkId(groupId, "Group ID");
		adminId = Validation.checkId(adminId, "Admin ID");

		// Get group data
		const group = await getGroupById(groupId);

		// Check if admin is the group admin
		if (group.members[0] !== adminId) {
			throw new ValidationError(
				"Only the group admin can view pending users"
			);
		}

		const usersCollection = await users();
		const pendingUsers = [];

		// Get details for each pending user
		for (const userId of group.pendingMembers) {
			const user = await usersCollection.findOne({
				_id: new ObjectId(userId),
			});
			if (user) {
				pendingUsers.push([userId, user.userName]);
			}
		}

		return pendingUsers;
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError
		) {
			throw error;
		}
		console.error("Error getting pending users for group:", error);
		throw new Error(`Failed to get pending users: ${error.message}`);
	}
};

/**
 * Get joined users for a group with additional user data
 * @param {string} groupId - Group ID
 * @param {string} adminId - Admin user ID
 * @returns {Array} Array of joined users with details
 */
export const getJoinedUsers = async (groupId, adminId) => {
	try {
		groupId = Validation.checkId(groupId, "Group ID");
		adminId = Validation.checkId(adminId, "Admin ID");

		// Get group data
		const group = await getGroupById(groupId);

		// Check if admin is the group admin
		if (group.members[0] !== adminId) {
			throw new ValidationError(
				"Only the group admin can view detailed member info"
			);
		}

		const usersCollection = await users();
		const joinedUsers = [];

		// Get details for each member
		for (const userId of group.members) {
			const user = await usersCollection.findOne({
				_id: new ObjectId(userId),
			});
			if (user) {
				joinedUsers.push([userId, user.userName]);
			}
		}

		return joinedUsers;
	} catch (error) {
		if (
			error instanceof ValidationError ||
			error instanceof NotFoundError
		) {
			throw error;
		}
		console.error("Error getting joined users for group:", error);
		throw new Error(`Failed to get joined users: ${error.message}`);
	}
};

/**
 * Get non-full groups for browsing
 * @returns {Array} Array of non-full groups with future meetings
 */
export const getAllNonFullGroups = async () => {
	try {
		const groupsCollection = await groups();

		// Get current date
		const today = new Date();
		const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

		// Find non-full groups with future meetings
		const nonFullGroups = await groupsCollection
			.find({
				isFull: false,
				meetingDate: { $gte: todayStr },
			})
			.sort({ meetingDate: 1 })
			.toArray();

		// Convert ObjectIds to strings
		nonFullGroups.forEach((group) => {
			group._id = group._id.toString();
		});

		return nonFullGroups;
	} catch (error) {
		console.error("Error getting non-full groups:", error);
		throw new Error(`Failed to get non-full groups: ${error.message}`);
	}
};

/**
 * Helper function to create a group
 * @param {string} groupName - Group name
 * @param {string} description - Group description
 * @param {number} capacity - Maximum capacity
 * @param {string} location - Meeting location
 * @param {string} course - Course identifier
 * @param {string} startTime - Start time
 * @param {string} endTime - End time
 * @param {string} meetingDate - Meeting date
 * @param {string} groupType - Group type
 * @param {string} creatorId - Creator user ID
 * @param {Array} tags - Group tags
 * @returns {Object} Created group
 */
export const createGroupHelper = async (
	groupName,
	description,
	capacity,
	location,
	course,
	startTime,
	endTime,
	meetingDate,
	groupType,
	creatorId,
	tags
) => {
	return await createGroup(
		groupName,
		description,
		capacity,
		location,
		course,
		startTime,
		endTime,
		meetingDate,
		groupType,
		creatorId,
		tags
	);
};

// Export all functions
export default {
	createGroup,
	createGroupHelper,
	getGroupById,
	updateGroup,
	deleteGroup,
	getAllGroups,
	searchGroups,
	getGroupsForMember,
	getGroupDataForMember,
	getJoinedGroupsForMember,
	getJoinedGroupDataForMember,
	getPendingGroupsForMember,
	getPendingGroupDataForMember,
	requestToJoin,
	cancelRequest,
	approveUser,
	rejectUser,
	removeUser,
	leaveGroup,
	getPendingUsersForGroup,
	getJoinedUsers,
	getAllNonFullGroups,
	assignUserRoles,
	addGroupToUserSchedule,
	checkScheduleConflictsForMembers,
	updateMembersSchedules,
	removeGroupFromUserSchedule,
};
