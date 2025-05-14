import { dbConnection, closeConnection } from "../config/mongoConnection.js";
import { users } from "../config/mongoCollections.js";
import { groups } from "../config/mongoCollections.js";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

const seedData = async () => {
	try {
		const db = await dbConnection();
		await db.dropDatabase(); // Clear existing data

		// Create collections
		const usersCollection = await users();
		const groupsCollection = await groups();

		// Create test users
		const saltRounds = 10;
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

		// Insert users and store their IDs
		const userIds = {};
		for (const user of testUsers) {
			const insertInfo = await usersCollection.insertOne(user);
			userIds[user.userName] = insertInfo.insertedId.toString();
		}

		// Create test groups
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

		// Insert groups
		for (const group of testGroups) {
			const insertInfo = await groupsCollection.insertOne(group);
			const groupId = insertInfo.insertedId.toString();

			// Update the creator's createdGroups array
			await usersCollection.updateOne(
				{ _id: new ObjectId(group.members[0]) },
				{ $push: { createdGroups: groupId } }
			);

			// Update pending members' pendingGroups array
			for (const pendingMemberId of group.pendingMembers) {
				await usersCollection.updateOne(
					{ _id: new ObjectId(pendingMemberId) },
					{ $push: { pendingGroups: groupId } }
				);
			}
		}

		console.log("Database seeded successfully!");
		console.log("Test User Credentials:");
		console.log(
			"1. Username: john_doe@stevens.edu, Password: Password123!"
		);
		console.log(
			"2. Username: jane_smith@stevens.edu, Password: Password123!"
		);
		console.log(
			"3. Username: bob_wilson@stevens.edu, Password: Password123!"
		);

		await closeConnection();
		process.exit(0);
	} catch (error) {
		console.error("Error seeding database:", error);
		await closeConnection();
		process.exit(1);
	}
};

// Run the seed function
seedData();
