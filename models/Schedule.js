import { ObjectId } from "mongodb";
import { schedule } from "../config/mongoCollections.js";
import { ValidationError } from "../utils/error-utils.js";
import Validation from "../helpers.js";

/**
 * Schedule management functions for CoFlow
 */

/**
 * Add an event to a user's schedule
 * @param {string} userId - User ID
 * @param {string} groupId - Group ID
 * @param {string} meetingDate - Meeting date (YYYY-MM-DD)
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @returns {Object} - Result of the operation
 */
export const addEventToSchedule = async (
	userId,
	groupId,
	meetingDate,
	startTime,
	endTime
) => {
	try {
		// Validate inputs
		userId = Validation.checkId(userId, "User ID");
		groupId = Validation.checkId(groupId, "Group ID");
		meetingDate = Validation.checkDate(meetingDate);
		startTime = Validation.checkTime(startTime);
		endTime = Validation.checkTime(endTime);

		// Ensure end time is after start time
		Validation.checkTimes(startTime, endTime);

		// Create event object
		const scheduleEvent = {
			_id: new ObjectId(),
			userId: new ObjectId(userId),
			groupId: new ObjectId(groupId),
			meetingDate,
			startTime,
			endTime,
			createdAt: new Date().toISOString(),
			reminderSent: false,
		};

		// Add to schedule collection
		const scheduleCollection = await schedule();
		const result = await scheduleCollection.insertOne(scheduleEvent);

		if (!result.acknowledged) {
			throw new Error("Failed to add event to schedule");
		}

		return {
			success: true,
			message: "Event added to schedule",
			eventId: result.insertedId.toString(),
		};
	} catch (error) {
		console.error("Error adding event to schedule:", error);
		throw error;
	}
};

/**
 * Check for schedule conflicts
 * @param {string} userId - User ID
 * @param {string} meetingDate - Meeting date
 * @param {string} startTime - Start time
 * @param {string} endTime - End time
 * @param {string} excludeGroupId - Group ID to exclude from check (optional)
 * @returns {Object} - Result with conflict status
 */
export const checkScheduleConflict = async (
	userId,
	meetingDate,
	startTime,
	endTime,
	excludeGroupId = null
) => {
	try {
		// Validate inputs
		userId = Validation.checkId(userId, "User ID");
		meetingDate = Validation.checkDate(meetingDate);
		startTime = Validation.checkTime(startTime);
		endTime = Validation.checkTime(endTime);

		// Convert times to minutes for easier comparison
		const convertToMinutes = (time) => {
			const [hours, minutes] = time.split(":").map(Number);
			return hours * 60 + minutes;
		};

		const newStartMinutes = convertToMinutes(startTime);
		const newEndMinutes = convertToMinutes(endTime);

		// Query for events on the same date
		const scheduleCollection = await schedule();
		const query = {
			userId: new ObjectId(userId),
			meetingDate: meetingDate,
		};

		// Exclude specific group if provided
		if (excludeGroupId) {
			excludeGroupId = Validation.checkId(
				excludeGroupId,
				"Exclude Group ID"
			);
			query.groupId = { $ne: new ObjectId(excludeGroupId) };
		}

		const existingEvents = await scheduleCollection.find(query).toArray();

		// Check for conflicts
		const conflicts = [];

		for (const event of existingEvents) {
			const existingStartMinutes = convertToMinutes(event.startTime);
			const existingEndMinutes = convertToMinutes(event.endTime);

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
				conflicts.push({
					eventId: event._id.toString(),
					groupId: event.groupId.toString(),
					meetingDate: event.meetingDate,
					startTime: event.startTime,
					endTime: event.endTime,
				});
			}
		}

		return {
			hasConflict: conflicts.length > 0,
			conflicts,
		};
	} catch (error) {
		console.error("Error checking schedule conflict:", error);
		throw error;
	}
};

/**
 * Get a user's schedule
 * @param {string} userId - User ID
 * @param {Object} filters - Optional filters (date range, etc.)
 * @returns {Array} - Array of schedule events
 */
export const getUserSchedule = async (userId, filters = {}) => {
	try {
		userId = Validation.checkId(userId, "User ID");

		const scheduleCollection = await schedule();
		const query = { userId: new ObjectId(userId) };

		// Add date range filter if provided
		if (filters.startDate && filters.endDate) {
			filters.startDate = Validation.checkDate(filters.startDate);
			filters.endDate = Validation.checkDate(filters.endDate);

			query.meetingDate = {
				$gte: filters.startDate,
				$lte: filters.endDate,
			};
		} else if (filters.startDate) {
			filters.startDate = Validation.checkDate(filters.startDate);
			query.meetingDate = { $gte: filters.startDate };
		} else if (filters.endDate) {
			filters.endDate = Validation.checkDate(filters.endDate);
			query.meetingDate = { $lte: filters.endDate };
		}

		// Get events sorted by date and time
		const events = await scheduleCollection
			.find(query)
			.sort({ meetingDate: 1, startTime: 1 })
			.toArray();

		// Convert ObjectIds to strings
		events.forEach((event) => {
			event._id = event._id.toString();
			event.userId = event.userId.toString();
			event.groupId = event.groupId.toString();
		});

		return events;
	} catch (error) {
		console.error("Error getting user schedule:", error);
		throw error;
	}
};

/**
 * Remove an event from a user's schedule
 * @param {string} userId - User ID
 * @param {string} groupId - Group ID
 * @returns {Object} - Result of the operation
 */
export const removeEventFromSchedule = async (userId, groupId) => {
	try {
		userId = Validation.checkId(userId, "User ID");
		groupId = Validation.checkId(groupId, "Group ID");

		const scheduleCollection = await schedule();
		const result = await scheduleCollection.deleteOne({
			userId: new ObjectId(userId),
			groupId: new ObjectId(groupId),
		});

		if (result.deletedCount === 0) {
			return {
				success: false,
				message: "Event not found in schedule",
			};
		}

		return {
			success: true,
			message: "Event removed from schedule",
		};
	} catch (error) {
		console.error("Error removing event from schedule:", error);
		throw error;
	}
};

/**
 * Update a schedule event
 * @param {string} userId - User ID
 * @param {string} groupId - Group ID
 * @param {Object} updates - Fields to update
 * @returns {Object} - Updated event
 */
export const updateScheduleEvent = async (userId, groupId, updates) => {
	try {
		userId = Validation.checkId(userId, "User ID");
		groupId = Validation.checkId(groupId, "Group ID");

		// Validate update fields
		const updateFields = {};

		if (updates.meetingDate) {
			updateFields.meetingDate = Validation.checkDate(
				updates.meetingDate
			);
		}

		if (updates.startTime) {
			updateFields.startTime = Validation.checkTime(updates.startTime);
		}

		if (updates.endTime) {
			updateFields.endTime = Validation.checkTime(updates.endTime);
		}

		// Ensure times are valid if both are provided
		if (updates.startTime && updates.endTime) {
			Validation.checkTimes(updates.startTime, updates.endTime);
		}

		// Check for existing event
		const scheduleCollection = await schedule();
		const existingEvent = await scheduleCollection.findOne({
			userId: new ObjectId(userId),
			groupId: new ObjectId(groupId),
		});

		if (!existingEvent) {
			throw new ValidationError("Schedule event not found");
		}

		// Check for conflicts with updated times
		if (
			updateFields.meetingDate ||
			updateFields.startTime ||
			updateFields.endTime
		) {
			const meetingDate =
				updateFields.meetingDate || existingEvent.meetingDate;
			const startTime = updateFields.startTime || existingEvent.startTime;
			const endTime = updateFields.endTime || existingEvent.endTime;

			const { hasConflict, conflicts } = await checkScheduleConflict(
				userId,
				meetingDate,
				startTime,
				endTime,
				groupId
			);

			if (hasConflict) {
				throw new ValidationError(
					`Schedule conflict detected with ${conflicts.length} other event(s)`
				);
			}
		}

		// Update the event
		const result = await scheduleCollection.updateOne(
			{
				userId: new ObjectId(userId),
				groupId: new ObjectId(groupId),
			},
			{ $set: updateFields }
		);

		if (result.modifiedCount === 0) {
			throw new Error("Failed to update schedule event");
		}

		// Return updated event
		const updatedEvent = await scheduleCollection.findOne({
			userId: new ObjectId(userId),
			groupId: new ObjectId(groupId),
		});

		// Convert ObjectIds to strings
		updatedEvent._id = updatedEvent._id.toString();
		updatedEvent.userId = updatedEvent.userId.toString();
		updatedEvent.groupId = updatedEvent.groupId.toString();

		return updatedEvent;
	} catch (error) {
		console.error("Error updating schedule event:", error);
		throw error;
	}
};

export default {
	addEventToSchedule,
	checkScheduleConflict,
	getUserSchedule,
	removeEventFromSchedule,
	updateScheduleEvent,
};
