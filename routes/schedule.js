import { Router } from "express";
const router = Router();
import * as scheduleModel from "../models/Schedule.js";
import * as groupData from "../data/groups.js";
import * as userData from "../data/user.js";
import * as notificationService from "../services/notificationService.js";
import { ensureAuthenticated } from "../middleware/auth-middleware.js";
import { ValidationError } from "../utils/error-utils.js";
import { asyncHandler } from "../utils/error-utils.js";

/**
 * GET /schedule - Display user's schedule
 */
router.get(
	"/",
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			const userId = req.session.user.id;

			// Get filter parameters
			const startDate = req.query.startDate;
			const endDate = req.query.endDate;
			const filters = {};

			if (startDate) filters.startDate = startDate;
			if (endDate) filters.endDate = endDate;

			// Get schedule events
			const events = await scheduleModel.getUserSchedule(userId, filters);

			// Get group details for each event
			const enrichedEvents = [];

			for (const event of events) {
				try {
					const group = await groupData.getGroupById(event.groupId);
					enrichedEvents.push({
						...event,
						groupName: group.groupName,
						course: group.course,
						location: group.location,
					});
				} catch (error) {
					// If group not found, still include the event with basic info
					console.warn(`Group not found for event: ${event.groupId}`);
					enrichedEvents.push({
						...event,
						groupName: "Unknown Group",
						course: "N/A",
						location: "N/A",
					});
				}
			}

			// Render schedule page
			res.render("schedule", {
				title: "My Schedule",
				events: enrichedEvents,
				startDate,
				endDate,
			});
		} catch (error) {
			console.error("Error fetching schedule:", error);
			res.status(500).render("error", {
				title: "Error",
				message: error.message || "Failed to load schedule",
			});
		}
	})
);

/**
 * GET /schedule/calendar - Display calendar view
 */
router.get(
	"/calendar",
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			const userId = req.session.user.id;

			// Get schedule events for the next month by default
			const today = new Date();
			const nextMonth = new Date(today);
			nextMonth.setMonth(today.getMonth() + 1);

			const startDate = today.toISOString().split("T")[0];
			const endDate = nextMonth.toISOString().split("T")[0];

			// Get schedule events
			const events = await scheduleModel.getUserSchedule(userId, {
				startDate,
				endDate,
			});

			// Get group details for each event
			const calendarEvents = [];

			for (const event of events) {
				try {
					const group = await groupData.getGroupById(event.groupId);
					calendarEvents.push({
						id: event._id,
						groupId: event.groupId,
						title: group.groupName,
						start: `${event.meetingDate}T${event.startTime}`,
						end: `${event.meetingDate}T${event.endTime}`,
						description: group.description,
						location: group.location,
						course: group.course,
					});
				} catch (error) {
					// If group not found, still include the event with basic info
					console.warn(`Group not found for event: ${event.groupId}`);
					calendarEvents.push({
						id: event._id,
						groupId: event.groupId,
						title: "Unknown Group",
						start: `${event.meetingDate}T${event.startTime}`,
						end: `${event.meetingDate}T${event.endTime}`,
						description: "Group details not available",
						location: "N/A",
						course: "N/A",
					});
				}
			}

			// Render calendar page
			res.render("calendar", {
				title: "Calendar View",
				calendarEvents: JSON.stringify(calendarEvents),
			});
		} catch (error) {
			console.error("Error fetching calendar data:", error);
			res.status(500).render("error", {
				title: "Error",
				message: error.message || "Failed to load calendar",
			});
		}
	})
);

/**
 * POST /schedule/check-conflict - Check for schedule conflicts
 */
router.post(
	"/check-conflict",
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			const userId = req.session.user.id;
			const { meetingDate, startTime, endTime, groupId } = req.body;

			if (!meetingDate || !startTime || !endTime) {
				throw new ValidationError(
					"Meeting date, start time, and end time are required"
				);
			}

			// Check for conflicts
			const result = await scheduleModel.checkScheduleConflict(
				userId,
				meetingDate,
				startTime,
				endTime,
				groupId // Exclude current group if provided
			);

			// Return conflict status
			res.json(result);
		} catch (error) {
			console.error("Error checking schedule conflict:", error);
			res.status(400).json({
				success: false,
				message: error.message || "Failed to check schedule conflicts",
			});
		}
	})
);

/**
 * POST /schedule/send-reminder - Manually send a reminder for a group
 */
router.post(
	"/send-reminder",
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			const userId = req.session.user.id;
			const { groupId } = req.body;

			if (!groupId) {
				throw new ValidationError("Group ID is required");
			}

			// Send reminder
			const result = await notificationService.sendGroupReminder(
				userId,
				groupId
			);

			// Return result
			if (result.success) {
				req.session.success = "Reminder sent successfully";
				res.redirect("/schedule");
			} else {
				throw new Error(result.message);
			}
		} catch (error) {
			console.error("Error sending reminder:", error);
			res.status(400).render("error", {
				title: "Error",
				message: error.message || "Failed to send reminder",
			});
		}
	})
);

/**
 * GET /schedule/settings - Notification settings page
 */
router.get(
	"/settings",
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			const userId = req.session.user.id;

			// Get user data
			const user = await userData.findUserById(userId);

			// Default notification settings if not set
			const notificationSettings = user.notificationSettings || {
				emailReminders: true,
				reminderTime: "24h", // Default to 24 hours before
			};

			// Render settings page
			res.render("schedule-settings", {
				title: "Schedule Settings",
				notificationSettings,
				success: req.session.success,
				error: req.session.error,
			});

			// Clear session messages
			delete req.session.success;
			delete req.session.error;
		} catch (error) {
			console.error("Error fetching schedule settings:", error);
			res.status(500).render("error", {
				title: "Error",
				message: error.message || "Failed to load schedule settings",
			});
		}
	})
);

/**
 * POST /schedule/settings - Update notification settings
 */
router.post(
	"/settings",
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			const userId = req.session.user.id;
			const { emailReminders, reminderTime } = req.body;

			// Prepare settings object
			const notificationSettings = {
				emailReminders: emailReminders === "on",
				reminderTime: reminderTime || "24h",
			};

			// Get user data
			const user = await userData.findUserById(userId);

			// Update user with new notification settings
			await userData.updateUserProfile(
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
				user.profilePicture,
				notificationSettings // Add notification settings
			);

			// Set success message and redirect
			req.session.success = "Notification settings updated successfully";
			res.redirect("/schedule/settings");
		} catch (error) {
			console.error("Error updating notification settings:", error);
			req.session.error = error.message || "Failed to update settings";
			res.redirect("/schedule/settings");
		}
	})
);

export default router;
