import nodemailer from "nodemailer";
import { schedule } from "../config/mongoCollections.js";
import { users } from "../config/mongoCollections.js";
import { groups } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
	service: process.env.EMAIL_SERVICE || "gmail",
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASSWORD,
	},
});

/**
 * Send an email notification
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text email body
 * @param {string} html - HTML email body (optional)
 * @returns {Promise<Object>} - Result of sending email
 */
export const sendEmail = async (to, subject, text, html = null) => {
	try {
		// Configure email options
		const mailOptions = {
			from: process.env.EMAIL_USER,
			to,
			subject,
			text,
		};

		// Add HTML version if provided
		if (html) {
			mailOptions.html = html;
		}

		// Send email
		const info = await transporter.sendMail(mailOptions);

		return {
			success: true,
			messageId: info.messageId,
			message: "Email sent successfully",
		};
	} catch (error) {
		console.error("Error sending email:", error);
		return {
			success: false,
			message: `Failed to send email: ${error.message}`,
		};
	}
};

/**
 * Send a group reminder to a user
 * @param {string} userId - User ID
 * @param {string} groupId - Group ID
 * @param {string} reminderTime - When to send reminder (hours before event)
 * @returns {Promise<Object>} - Result of sending reminder
 */
export const sendGroupReminder = async (
	userId,
	groupId,
	reminderTime = "24h"
) => {
	try {
		// Get user and group information
		const usersCollection = await users();
		const groupsCollection = await groups();

		const user = await usersCollection.findOne({
			_id: new ObjectId(userId),
		});
		const group = await groupsCollection.findOne({
			_id: new ObjectId(groupId),
		});

		if (!user || !group) {
			throw new Error("User or group not found");
		}

		// Create email content
		const subject = `Reminder: ${group.groupName} study session`;

		const text = `
Hello ${user.firstName},

This is a reminder that you have a study session coming up:

Group: ${group.groupName}
Course: ${group.course}
Date: ${group.meetingDate}
Time: ${group.startTime} - ${group.endTime}
Location: ${group.location}

Don't forget to bring your study materials!

Best regards,
The CoFlow Team
    `;

		const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
  <h2 style="color: #3498db;">Study Session Reminder</h2>
  <p>Hello ${user.firstName},</p>
  <p>This is a reminder that you have a study session coming up:</p>
  
  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
    <p><strong>Group:</strong> ${group.groupName}</p>
    <p><strong>Course:</strong> ${group.course}</p>
    <p><strong>Date:</strong> ${group.meetingDate}</p>
    <p><strong>Time:</strong> ${group.startTime} - ${group.endTime}</p>
    <p><strong>Location:</strong> ${group.location}</p>
  </div>
  
  <p>Don't forget to bring your study materials!</p>
  
  <p>Best regards,<br>The CoFlow Team</p>
</div>
    `;

		// Send the email
		const result = await sendEmail(user.email, subject, text, html);

		// Mark reminder as sent if successful
		if (result.success) {
			const scheduleCollection = await schedule();
			await scheduleCollection.updateOne(
				{
					userId: new ObjectId(userId),
					groupId: new ObjectId(groupId),
				},
				{
					$set: {
						reminderSent: true,
						reminderSentAt: new Date().toISOString(),
					},
				}
			);
		}

		return result;
	} catch (error) {
		console.error("Error sending group reminder:", error);
		return {
			success: false,
			message: `Failed to send reminder: ${error.message}`,
		};
	}
};

/**
 * Process schedule reminders for upcoming events
 * This function should be run periodically (e.g., hourly) to send reminders
 * @returns {Promise<Object>} - Result of processing reminders
 */
export const processScheduleReminders = async () => {
	try {
		const scheduleCollection = await schedule();
		const usersCollection = await users();

		// Get current date
		const now = new Date();
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);

		// Format date as YYYY-MM-DD
		const tomorrowString = tomorrow.toISOString().split("T")[0];

		// Find tomorrow's events where reminder hasn't been sent
		const upcomingEvents = await scheduleCollection
			.find({
				meetingDate: tomorrowString,
				reminderSent: { $ne: true },
			})
			.toArray();

		console.log(
			`Found ${upcomingEvents.length} upcoming events needing reminders`
		);

		// Send reminders for each event
		const results = [];

		for (const event of upcomingEvents) {
			const userId = event.userId.toString();
			const groupId = event.groupId.toString();

			// Get user's notification preferences
			const user = await usersCollection.findOne({
				_id: new ObjectId(userId),
			});

			// Check if user has notifications enabled
			if (
				user &&
				(!user.notificationSettings ||
					user.notificationSettings.emailReminders !== false)
			) {
				const result = await sendGroupReminder(userId, groupId);
				results.push({
					userId,
					groupId,
					success: result.success,
					message: result.message,
				});
			}
		}

		return {
			processed: upcomingEvents.length,
			results,
		};
	} catch (error) {
		console.error("Error processing schedule reminders:", error);
		return {
			success: false,
			message: `Failed to process reminders: ${error.message}`,
		};
	}
};

export default {
	sendEmail,
	sendGroupReminder,
	processScheduleReminders,
};
