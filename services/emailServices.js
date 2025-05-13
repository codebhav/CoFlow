import nodemailer from "nodemailer";
import dotenv from "dotenv";
import * as userData from "../data/user.js";
import * as groupData from "../data/groups.js";

// Load environment variables
dotenv.config();

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
	service: process.env.EMAIL_SERVICE || "gmail",
	auth: {
		user: process.env.EMAIL_USER || "",
		pass: process.env.EMAIL_PASSWORD || "",
	},
});

/**
 * Send an email notification
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email body (HTML)
 * @returns {Promise<boolean>} - Success status
 */
export const sendEmail = async (to, subject, html) => {
	try {
		// Skip if email service is not configured
		if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
			console.warn("Email service not configured. Skipping email send.");
			return false;
		}

		// Send mail with defined transport object
		const info = await transporter.sendMail({
			from: `"CoFlow Study App" <${process.env.EMAIL_USER}>`,
			to,
			subject,
			html,
		});

		console.log(`Email sent: ${info.messageId}`);
		return true;
	} catch (error) {
		console.error("Error sending email:", error);
		return false;
	}
};

/**
 * Send reminder emails for upcoming meetings for a specific user
 * @param {string} userId - User ID
 * @param {number} days - Days ahead to check (default: 1)
 * @returns {Promise<number>} - Number of notifications sent
 */
export const sendUpcomingMeetingsNotifications = async (userId, days = 1) => {
	try {
		// Get user data
		const user = await userData.findUserById(userId);
		if (!user) {
			console.error(`User not found: ${userId}`);
			return 0;
		}

		// Check if user has email notifications enabled
		const notificationSettings = user.notificationSettings || {};
		if (notificationSettings.emailNotifications === false) {
			console.log(`User ${userId} has email notifications disabled`);
			return 0;
		}

		// Get user email
		const email = user.email;
		if (!email) {
			console.error(`User ${userId} has no email address`);
			return 0;
		}

		// Calculate date range for upcoming meetings
		const today = new Date();
		const endDate = new Date();
		endDate.setDate(today.getDate() + parseInt(days));

		const todayStr = today.toISOString().split("T")[0];
		const endDateStr = endDate.toISOString().split("T")[0];

		// Get user's groups
		const createdGroups = await groupData.getGroupDataForMember(userId);
		const joinedGroups = await groupData.getJoinedGroupDataForMember(
			userId
		);

		// Combine and filter by date range
		const allGroups = [...createdGroups, ...joinedGroups];
		const upcomingGroups = allGroups.filter(
			(group) =>
				group.meetingDate >= todayStr && group.meetingDate <= endDateStr
		);

		if (upcomingGroups.length === 0) {
			console.log(
				`No upcoming meetings for user ${userId} in the next ${days} days`
			);
			return 0;
		}

		// Sort by date and time
		upcomingGroups.sort((a, b) => {
			if (a.meetingDate !== b.meetingDate) {
				return a.meetingDate.localeCompare(b.meetingDate);
			}
			return a.startTime.localeCompare(b.startTime);
		});

		// Create email content
		const subject = `Your Upcoming Study Sessions for the Next ${days} Day${
			days > 1 ? "s" : ""
		}`;

		let html = `
            <h2>Hi ${user.firstName},</h2>
            <p>You have ${upcomingGroups.length} upcoming study session${
			upcomingGroups.length > 1 ? "s" : ""
		} in the next ${days} day${days > 1 ? "s" : ""}:</p>
            <table style="border-collapse: collapse; width: 100%;">
                <tr style="background-color: #f2f2f2;">
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Group</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Date</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Time</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Location</th>
                </tr>
        `;

		upcomingGroups.forEach((group) => {
			const dateObj = new Date(group.meetingDate);
			const formattedDate = dateObj.toLocaleDateString("en-US", {
				weekday: "long",
				year: "numeric",
				month: "long",
				day: "numeric",
			});

			html += `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${group.groupName}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${formattedDate}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${group.startTime} - ${group.endTime}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${group.location}</td>
                </tr>
            `;
		});

		html += `
            </table>
            <p style="margin-top: 20px;">You can view your complete schedule on the <a href="${
				process.env.APP_URL || "http://localhost:3000"
			}/schedule/calendar">CoFlow Calendar</a>.</p>
            <p>Happy studying!</p>
            <p>The CoFlow Team</p>
        `;

		// Send email
		const sent = await sendEmail(email, subject, html);

		return sent ? upcomingGroups.length : 0;
	} catch (error) {
		console.error("Error sending meeting notifications:", error);
		return 0;
	}
};

/**
 * Send reminder emails for upcoming meetings to all users
 * @param {number} days - Days ahead to check (default: 1)
 * @returns {Promise<number>} - Number of users notified
 */
export const sendUpcomingMeetingsNotificationsToAll = async (days = 1) => {
	try {
		// Get all users
		const allUsers = await userData.getAllUsers();

		let notifiedCount = 0;

		// Send notifications to each user
		for (const user of allUsers) {
			try {
				const sentCount = await sendUpcomingMeetingsNotifications(
					user._id,
					days
				);
				if (sentCount > 0) {
					notifiedCount++;
				}
			} catch (error) {
				console.error(
					`Error sending notifications to user ${user._id}:`,
					error
				);
				// Continue with next user
			}
		}

		return notifiedCount;
	} catch (error) {
		console.error("Error sending notifications to all users:", error);
		return 0;
	}
};

/**
 * Send a welcome email to a new user
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Success status
 */
export const sendWelcomeEmail = async (userId) => {
	try {
		// Get user data
		const user = await userData.findUserById(userId);
		if (!user) {
			console.error(`User not found: ${userId}`);
			return false;
		}

		// Get user email
		const email = user.email;
		if (!email) {
			console.error(`User ${userId} has no email address`);
			return false;
		}

		// Create email content
		const subject = "Welcome to CoFlow Study App!";

		const html = `
            <h2>Welcome to CoFlow, ${user.firstName}!</h2>
            <p>Thank you for joining CoFlow, the collaborative study app designed to help students connect and learn together.</p>
            <h3>Getting Started:</h3>
            <ol>
                <li><strong>Complete your profile</strong> - Add your courses and update your profile to help others find you.</li>
                <li><strong>Browse study groups</strong> - Find groups that match your interests and schedule.</li>
                <li><strong>Create your own group</strong> - Start a study session and invite classmates to join.</li>
            </ol>
            <p>You can access your personalized dashboard at any time by visiting <a href="${
				process.env.APP_URL || "http://localhost:3000"
			}/profile">your profile</a>.</p>
            <p>If you have any questions or need assistance, please reply to this email.</p>
            <p>Happy studying!</p>
            <p>The CoFlow Team</p>
        `;

		// Send email
		return await sendEmail(email, subject, html);
	} catch (error) {
		console.error("Error sending welcome email:", error);
		return false;
	}
};

/**
 * Send a group join confirmation email
 * @param {string} userId - User ID
 * @param {string} groupId - Group ID
 * @returns {Promise<boolean>} - Success status
 */
export const sendGroupJoinConfirmation = async (userId, groupId) => {
	try {
		// Get user data
		const user = await userData.findUserById(userId);
		if (!user) {
			console.error(`User not found: ${userId}`);
			return false;
		}

		// Check if user has email notifications enabled
		const notificationSettings = user.notificationSettings || {};
		if (notificationSettings.emailNotifications === false) {
			console.log(`User ${userId} has email notifications disabled`);
			return false;
		}

		// Get user email
		const email = user.email;
		if (!email) {
			console.error(`User ${userId} has no email address`);
			return false;
		}

		// Get group data
		const group = await groupData.getGroupById(groupId);
		if (!group) {
			console.error(`Group not found: ${groupId}`);
			return false;
		}

		// Create email content
		const subject = `You've Been Added to ${group.groupName}`;

		const dateObj = new Date(group.meetingDate);
		const formattedDate = dateObj.toLocaleDateString("en-US", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});

		const html = `
            <h2>Hi ${user.firstName},</h2>
            <p>You have been added to the study group <strong>${
				group.groupName
			}</strong>!</p>
            <h3>Group Details:</h3>
            <ul>
                <li><strong>Course:</strong> ${group.course}</li>
                <li><strong>Date:</strong> ${formattedDate}</li>
                <li><strong>Time:</strong> ${group.startTime} - ${
			group.endTime
		}</li>
                <li><strong>Location:</strong> ${group.location}</li>
            </ul>
            <p>You can view the complete group details and join the discussion by visiting the <a href="${
				process.env.APP_URL || "http://localhost:3000"
			}/groups/${group._id}">group page</a>.</p>
            <p>Happy studying!</p>
            <p>The CoFlow Team</p>
        `;

		// Send email
		return await sendEmail(email, subject, html);
	} catch (error) {
		console.error("Error sending group join confirmation:", error);
		return false;
	}
};

export default {
	sendEmail,
	sendUpcomingMeetingsNotifications,
	sendUpcomingMeetingsNotificationsToAll,
	sendWelcomeEmail,
	sendGroupJoinConfirmation,
};
