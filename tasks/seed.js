import { dbConnection, closeConnection } from "../config/mongoConnection.js";
import { users, groups, admin } from "../config/mongoCollections.js";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

const seedData = async () => {
	try {
		const db = await dbConnection();
		await db.dropDatabase(); // Clear existing data

		// Create collections
		const usersCollection = await users();
		const groupsCollection = await groups();
		const adminCollection = await admin();

		const saltRounds = 10;

		// Sample users
		const testUsers = [
			{
				userName: "john_doe",
				email: "john@stevens.edu",
				password: await bcrypt.hash("Password123!", saltRounds),
				firstName: "John",
				lastName: "Doe",
				role: "user",
				createdGroups: [],
				joinedGroups: [],
				pendingGroups: [],
				profilePicture: "/public/images/default-profile.png",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			{
				userName: "jane_smith",
				email: "jane@stevens.edu",
				password: await bcrypt.hash("Password123!", saltRounds),
				firstName: "Jane",
				lastName: "Smith",
				role: "user",
				createdGroups: [],
				joinedGroups: [],
				pendingGroups: [],
				profilePicture: "/public/images/default-profile.png",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			{
				userName: "bob_wilson",
				email: "bob@stevens.edu",
				password: await bcrypt.hash("Password123!", saltRounds),
				firstName: "Bob",
				lastName: "Wilson",
				role: "user",
				createdGroups: [],
				joinedGroups: [],
				pendingGroups: [],
				profilePicture: "/public/images/default-profile.png",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		];

		// Insert users and keep track of IDs
		const userIds = {};
		for (const user of testUsers) {
			const { insertedId } = await usersCollection.insertOne(user);
			userIds[user.userName] = insertedId.toString();
		}

		// Sample groups
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const tomorrowStr = tomorrow.toISOString().split("T")[0];

		const nextWeek = new Date();
		nextWeek.setDate(nextWeek.getDate() + 7);
		const nextWeekStr = nextWeek.toISOString().split("T")[0];

		const testGroups = [
			{
				groupName: "CS 546 Study Group",
				course: "CS 546",
				groupType: "study-group",
				meetingDate: tomorrowStr,
				startTime: "14:00",
				endTime: "16:00",
				location: "Library",
				isFull: false,
				description:
					"Web Programming I study group focusing on Node.js and MongoDB",
				capacity: 5,
				members: [userIds.john_doe],
				pendingMembers: [userIds.jane_smith],
				rejectedMembers: [],
				tags: ["web", "javascript", "nodejs"],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			{
				groupName: "CS 554 Project Team",
				course: "CS 554",
				groupType: "project-group",
				meetingDate: nextWeekStr,
				startTime: "15:00",
				endTime: "17:00",
				location: "Gateway South",
				isFull: false,
				description:
					"Working on the final project for Web Programming II",
				capacity: 4,
				members: [userIds.jane_smith],
				pendingMembers: [userIds.bob_wilson],
				rejectedMembers: [],
				tags: ["react", "typescript", "project"],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			{
				groupName: "CS 385 Algorithms",
				course: "CS 385",
				groupType: "study-group",
				meetingDate: tomorrowStr,
				startTime: "10:00",
				endTime: "12:00",
				location: "Babbio",
				isFull: false,
				description: "Preparing for the algorithms midterm exam",
				capacity: 6,
				members: [userIds.bob_wilson],
				pendingMembers: [],
				rejectedMembers: [],
				tags: ["algorithms", "cpp", "exam-prep"],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		];

		// Insert groups and update user group references
		for (const group of testGroups) {
			const { insertedId } = await groupsCollection.insertOne(group);
			const groupId = insertedId.toString();

			// Update creator's createdGroups
			await usersCollection.updateOne(
				{ _id: new ObjectId(group.members[0]) },
				{ $push: { createdGroups: groupId } }
			);

			// Update pending members' pendingGroups
			for (const pendingId of group.pendingMembers) {
				await usersCollection.updateOne(
					{ _id: new ObjectId(pendingId) },
					{ $push: { pendingGroups: groupId } }
				);
			}
		}

		// Seed admin user
		const adminData = {
			userName: "Admin_admin",
			hashedPassword: await bcrypt.hash("12345Abcde@", saltRounds),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		const { insertedId: adminId } = await adminCollection.insertOne(
			adminData
		);
		if (!adminId) throw "Error in creating seed admin";

		console.log("Database seeded successfully!");
		console.log("Test User Credentials:");
		console.log("1. john_doe@stevens.edu / Password: Password123!");
		console.log("2. jane_smith@stevens.edu / Password: Password123!");
		console.log("3. bob_wilson@stevens.edu / Password: Password123!");
		console.log("Admin Credentials:");
		console.log("Username: Admin_admin / Password: 12345Abcde@");

		await closeConnection();
		process.exit(0);
	} catch (error) {
		console.error("Error seeding database:", error);
		await closeConnection();
		process.exit(1);
	}
};

// Run seeding
seedData();
