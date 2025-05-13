// tasks/send-reminders.js

import { processScheduleReminders } from "../services/notificationService.js";
import { dbConnection, closeConnection } from "../config/mongoConnection.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Script to process and send scheduled reminders
 * This script can be run periodically using a scheduler like cron
 */
async function sendReminders() {
	try {
		console.log("Starting scheduled reminders process...");

		// Connect to database
		await dbConnection();

		// Process reminders
		const result = await processScheduleReminders();

		console.log(`Processed ${result.processed} reminders`);
		console.log("Results:", result.results);

		// Close database connection
		await closeConnection();

		console.log("Reminders process completed successfully");
		process.exit(0);
	} catch (error) {
		console.error("Error processing reminders:", error);
		process.exit(1);
	}
}

// Run the function
sendReminders();
