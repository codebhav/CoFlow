import * as userData from "../data/user.js";
import * as groupData from "../data/groups.js";
import {
	ValidationError,
	NotFoundError,
	ConflictError,
} from "../utils/error-utils.js";

/**
 * Check if a user has schedule conflicts with a new time slot
 * @param {string} userId - User ID to check
 * @param {string} meetingDate - Meeting date (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @param {string} excludeGroupId - Optional group ID to exclude from check (for updates)
 * @returns {Object} Result with conflict status and details
 */
export const checkUserScheduleConflict = async (
	userId,
	meetingDate,
	startTime,
	endTime,
	excludeGroupId = null
) => {
	try {
		// Get user data
		const user = await userData.findUserById(userId);
		if (!user) {
			throw new NotFoundError("User not found");
		}

		// Get all user's groups
		const createdGroupsPromise = groupData.getGroupDataForMember(userId);
		const joinedGroupsPromise =
			groupData.getJoinedGroupDataForMember(userId);

		const [createdGroups, joinedGroups] = await Promise.all([
			createdGroupsPromise,
			joinedGroupsPromise,
		]);

		// Combine and filter out excluded group if provided
		const allGroups = [...createdGroups, ...joinedGroups];
		const relevantGroups = excludeGroupId
			? allGroups.filter((group) => group._id !== excludeGroupId)
			: allGroups;

		// Find groups on the same day
		const sameDate = relevantGroups.filter(
			(group) => group.meetingDate === meetingDate
		);

		if (sameDate.length === 0) {
			return { hasConflict: false };
		}

		// Convert times to minutes for comparison
		const convertToMinutes = (time) => {
			const [hours, minutes] = time.split(":").map(Number);
			return hours * 60 + minutes;
		};

		const newStartMinutes = convertToMinutes(startTime);
		const newEndMinutes = convertToMinutes(endTime);

		// Check for overlap with each group
		for (const group of sameDate) {
			const existingStartMinutes = convertToMinutes(group.startTime);
			const existingEndMinutes = convertToMinutes(group.endTime);

			// Check for any type of overlap:
			// 1. New start time falls during existing meeting
			// 2. New end time falls during existing meeting
			// 3. New meeting completely encompasses existing meeting
			if (
				(newStartMinutes >= existingStartMinutes &&
					newStartMinutes < existingEndMinutes) ||
				(newEndMinutes > existingStartMinutes &&
					newEndMinutes <= existingEndMinutes) ||
				(newStartMinutes <= existingStartMinutes &&
					newEndMinutes >= existingEndMinutes)
			) {
				return {
					hasConflict: true,
					conflictGroup: group,
					message: `Schedule conflict with group "${group.groupName}" (${group.startTime} - ${group.endTime})`,
				};
			}
		}

		// No conflicts found
		return { hasConflict: false };
	} catch (error) {
		console.error("Error checking schedule conflicts:", error);
		throw error;
	}
};

/**
 * Check for schedule conflicts for an entire group's members
 * @param {Array} memberIds - Array of user IDs to check
 * @param {string} meetingDate - Meeting date (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @param {string} excludeGroupId - Optional group ID to exclude from check (for updates)
 * @returns {Array} Array of conflicts if any
 */
export const checkGroupMembersScheduleConflicts = async (
	memberIds,
	meetingDate,
	startTime,
	endTime,
	excludeGroupId = null
) => {
	const conflicts = [];

	for (const memberId of memberIds) {
		try {
			const result = await checkUserScheduleConflict(
				memberId,
				meetingDate,
				startTime,
				endTime,
				excludeGroupId
			);

			if (result.hasConflict) {
				// Get user details for better error reporting
				const user = await userData.findUserById(memberId);
				conflicts.push({
					userId: memberId,
					userName: user ? user.userName : "Unknown User",
					conflictGroup: result.conflictGroup,
					message: result.message,
				});
			}
		} catch (error) {
			console.error(
				`Error checking conflicts for user ${memberId}:`,
				error
			);
			// Continue checking other users even if one fails
		}
	}

	return conflicts;
};

/**
 * Get schedule preview for a user
 * @param {string} userId - User ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Array of schedule items
 */
export const getUserSchedulePreview = async (userId, startDate, endDate) => {
	try {
		// Get user's groups
		const createdGroupsPromise = groupData.getGroupDataForMember(userId);
		const joinedGroupsPromise =
			groupData.getJoinedGroupDataForMember(userId);

		const [createdGroups, joinedGroups] = await Promise.all([
			createdGroupsPromise,
			joinedGroupsPromise,
		]);

		// Combine groups
		const allGroups = [...createdGroups, ...joinedGroups];

		// Filter by date range if provided
		const filteredGroups =
			startDate && endDate
				? allGroups.filter(
						(group) =>
							group.meetingDate >= startDate &&
							group.meetingDate <= endDate
				  )
				: allGroups;

		// Sort chronologically
		return filteredGroups.sort((a, b) => {
			// Sort by date first
			if (a.meetingDate !== b.meetingDate) {
				return a.meetingDate.localeCompare(b.meetingDate);
			}
			// If same date, sort by start time
			return a.startTime.localeCompare(b.startTime);
		});
	} catch (error) {
		console.error("Error getting user schedule preview:", error);
		throw error;
	}
};

export default {
	checkUserScheduleConflict,
	checkGroupMembersScheduleConflicts,
	getUserSchedulePreview,
};
