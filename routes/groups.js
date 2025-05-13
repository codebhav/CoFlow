import { Router } from "express";
const router = Router();
import * as groupData from "../data/groups.js";
import * as userData from "../data/user.js";
import middleware from "../middleware.js";
import { ensureAuthenticated } from "../middleware/auth-middleware.js";
import Validation from "../helpers.js";
import {
	ValidationError,
	NotFoundError,
	ConflictError,
} from "../utils/error-utils.js";
import { asyncHandler } from "../utils/error-utils.js";

/**
 * GET /groups - Browse all available groups
 */
router.route("/").get(
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			// Get user ID from session
			const userId = req.session.user._id;

			// Get all available groups with user role
			let groups = await groupData.getAllNonFullGroups();
			groups = await groupData.assignUserRoles(groups, userId);

			return res.render("groups", {
				title: "Browse Groups",
				groups,
			});
		} catch (error) {
			console.error("Error fetching groups:", error);
			return res.status(500).render("error", {
				title: "Error",
				message: "Failed to load groups",
			});
		}
	})
);

/**
 * POST /groups/search - Search for groups
 */
router.route("/search").post(
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			// Get search query and filters
			const { search = "", groupType, sortBy } = req.body;

			// Get user ID from session
			const userId = req.session.user.id;

			// Create filters object
			const filters = {
				groupType: groupType || undefined,
				sortBy: sortBy || "meetingDate",
				showPast: false,
				showFull: false,
			};

			// Search for groups with user role and filters
			let groups = await groupData.searchGroups(search, userId, filters);

			return res.render("groups", {
				title: "Search Results",
				groups,
				searchQuery: search,
				filters,
			});
		} catch (error) {
			console.error("Error searching groups:", error);
			return res.status(400).render("groups", {
				title: "Search Results",
				groups: [],
				error: error.message || "Failed to search groups",
				filters: req.body,
			});
		}
	})
);

/**
 * GET /groups/create - Render group creation form
 * POST /groups/create - Create a new group
 */
router
	.route("/create")
	.get(ensureAuthenticated, (req, res) => {
		res.render("create-group", {
			title: "Create Group",
			locations: [
				"Edwin A. Stevens",
				"Library",
				"Gateway South",
				"Gateway North",
				"North Building",
				"Babbio",
				"ABS",
				"Burchard",
				"Carnegie",
				"Davidson",
				"Altorfer",
				"Kidde",
				"McLean",
				"Morton",
				"Nicoll",
				"Pierce",
				"Rocco",
				"TBD",
			],
			groupTypes: ["study-group", "project-group"],
		});
	})
	.post(
		ensureAuthenticated,
		asyncHandler(async (req, res) => {
			try {
				// Extract form data
				const {
					groupName,
					description,
					capacity,
					location,
					course,
					startTime,
					endTime,
					meetingDate,
					groupType,
					tags,
				} = req.body;

				// Check if required fields are present
				if (
					!groupName ||
					!description ||
					!capacity ||
					!location ||
					!course ||
					!startTime ||
					!endTime ||
					!meetingDate ||
					!groupType
				) {
					throw new ValidationError(
						"All required fields must be provided"
					);
				}

				// Get user ID from session and ensure it's a string
				const userId = req.session.user.id.toString();
				if (!userId) {
					throw new ValidationError("User ID not found in session");
				}

				// Process tags (comma-separated string to array)
				let tagArray = [];
				if (tags && typeof tags === "string") {
					tagArray = tags
						.split(",")
						.map((tag) => tag.trim())
						.filter((tag) => tag.length > 0);
				}

				// Create group
				const newGroup = await groupData.createGroup(
					groupName,
					description,
					parseInt(capacity),
					location,
					course,
					startTime,
					endTime,
					meetingDate,
					groupType,
					userId,
					tagArray
				);

				// Redirect to my groups page
				return res.redirect("/groups/myGroups");
			} catch (error) {
				console.error("Error creating group:", error);

				// Render form again with error
				return res.status(400).render("create-group", {
					title: "Create Group",
					error: error.message || "Failed to create group",
					locations: [
						"Edwin A. Stevens",
						"Library",
						"Gateway South",
						"Gateway North",
						"North Building",
						"Babbio",
						"ABS",
						"Burchard",
						"Carnegie",
						"Davidson",
						"Altorfer",
						"Kidde",
						"McLean",
						"Morton",
						"Nicoll",
						"Pierce",
						"Rocco",
						"TBD",
					],
					groupTypes: ["study-group", "project-group"],
					formData: req.body, // Pass back the form data to pre-fill the form
				});
			}
		})
	);

/**
 * GET /groups/:id - View a specific group
 */
/**
 * GET /groups/:id - View a specific group
 */
router.route("/:id").get(
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			const groupId = req.params.id;
			const userId = req.session._id;

			// Validate group ID
			Validation.checkId(groupId, "Group ID");

			// Get group data
			const group = await groupData.getGroupById(groupId);

			// Get user's role in the group
			const userGroups = [group];
			const groupWithRole = await groupData.assignUserRoles(
				userGroups,
				userId
			);
			const groupWithUserRole = groupWithRole[0];

			// Get group admin details
			const admin = await userData.findUserById(group.members[0]);

			// Render group details
			return res.render("group-details", {
				title: group.groupName,
				group: groupWithUserRole,
				admin: {
					userName: admin.userName,
					profilePicture:
						admin.profilePicture ||
						"/public/images/default-profile.png",
				},
			});
		} catch (error) {
			console.error("Error getting group details:", error);

			if (error instanceof NotFoundError) {
				return res.status(404).render("error", {
					title: "Group Not Found",
					message: "The requested group does not exist",
				});
			}

			return res.status(500).render("error", {
				title: "Error",
				message: error.message || "Failed to load group details",
			});
		}
	})
);

/**
 * GET /groups/:id/edit - Render group edit form
 * POST /groups/:id/edit - Update group details
 */
router
	.route("/:id/edit")
	.get(
		ensureAuthenticated,
		asyncHandler(async (req, res) => {
			try {
				const groupId = req.params.id;
				const userId = req.session.user._id;

				// Validate group ID
				Validation.checkId(groupId, "Group ID");

				// Get group data
				const group = await groupData.getGroupById(groupId);

				// Check if user is the group admin
				if (group.members[0] !== userId) {
					throw new ValidationError(
						"Only the group admin can edit the group"
					);
				}

				// Get current date for min attribute
				const today = new Date().toISOString().split("T")[0];

				// Render edit form
				return res.render("edit-group", {
					title: `Edit ${group.groupName}`,
					group,
					currentDate: today,
					locations: [
						"Edwin A. Stevens",
						"Library",
						"Gateway South",
						"Gateway North",
						"North Building",
						"Babbio",
						"ABS",
						"Burchard",
						"Carnegie",
						"Davidson",
						"Altorfer",
						"Kidde",
						"McLean",
						"Morton",
						"Nicoll",
						"Pierce",
						"Rocco",
						"TBD",
					],
					groupTypes: ["study-group", "project-group"],
				});
			} catch (error) {
				console.error("Error getting group edit form:", error);

				if (error instanceof NotFoundError) {
					return res.status(404).render("error", {
						title: "Group Not Found",
						message: "The requested group does not exist",
					});
				}

				if (error instanceof ValidationError) {
					return res.status(403).render("error", {
						title: "Access Denied",
						message: error.message,
					});
				}

				return res.status(500).render("error", {
					title: "Error",
					message: error.message || "Failed to load group edit form",
				});
			}
		})
	)
	.post(
		ensureAuthenticated,
		asyncHandler(async (req, res) => {
			try {
				const groupId = req.params.id;
				const userId = req.session.user._id;

				// Validate group ID
				Validation.checkId(groupId, "Group ID");

				// Extract form data
				const {
					groupName,
					description,
					capacity,
					location,
					course,
					startTime,
					endTime,
					meetingDate,
					groupType,
					tags,
				} = req.body;

				// Process tags (comma-separated string to array)
				let tagArray = [];
				if (tags && typeof tags === "string") {
					tagArray = tags
						.split(",")
						.map((tag) => tag.trim())
						.filter((tag) => tag.length > 0);
				}

				// Create updates object
				const updates = {
					groupName,
					description,
					capacity,
					location,
					course,
					startTime,
					endTime,
					meetingDate,
					groupType,
					tags: tagArray,
				};

				// Update group
				await groupData.updateGroup(groupId, updates, userId);

				// Redirect to group details
				return res.redirect(`/groups/${groupId}`);
			} catch (error) {
				console.error("Error updating group:", error);

				const groupId = req.params.id;

				// Get original group data for re-rendering the form
				try {
					const group = await groupData.getGroupById(groupId);
					const today = new Date().toISOString().split("T")[0];

					return res.status(400).render("edit-group", {
						title: `Edit ${group.groupName}`,
						group,
						currentDate: today,
						error: error.message || "Failed to update group",
						locations: [
							"Edwin A. Stevens",
							"Library",
							"Gateway South",
							"Gateway North",
							"North Building",
							"Babbio",
							"ABS",
							"Burchard",
							"Carnegie",
							"Davidson",
							"Altorfer",
							"Kidde",
							"McLean",
							"Morton",
							"Nicoll",
							"Pierce",
							"Rocco",
							"TBD",
						],
						groupTypes: ["study-group", "project-group"],
					});
				} catch (err) {
					// If we can't get the group, redirect to groups page
					return res.status(500).render("error", {
						title: "Error",
						message: "An error occurred while updating the group",
					});
				}
			}
		})
	);

/**
 * GET /groups/myGroups - View user's groups
 */
router.route("/myGroups").get(
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			// Get user ID from session and ensure it's a string
			const userId = req.session.user.id;
			if (!userId) {
				throw new ValidationError("User ID not found in session");
			}

			// Get user's groups
			const [createdGroups, joinedGroups, pendingGroups] =
				await Promise.all([
					groupData.getGroupDataForMember(userId),
					groupData.getJoinedGroupDataForMember(userId),
					groupData.getPendingGroupDataForMember(userId),
				]);

			return res.render("my-groups", {
				title: "My Groups",
				createdGroups: createdGroups || [],
				joinedGroups: joinedGroups || [],
				pendingGroups: pendingGroups || [],
			});
		} catch (error) {
			console.error("Error getting group details:", error);
			return res.status(400).render("my-groups", {
				title: "My Groups",
				error: error.message || "Failed to load groups",
				createdGroups: [],
				joinedGroups: [],
				pendingGroups: [],
			});
		}
	})
);

/**
 * POST /groups/reqJoin - Request to join a group
 */
router.route("/reqJoin").post(
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			const userId = req.session.user.id;
			const { formId } = req.body;

			if (!formId) {
				throw new ValidationError("Group ID is required");
			}

			// Request to join group
			await groupData.requestToJoin(userId, formId);

			// If AJAX request
			if (req.xhr) {
				return res.json({
					success: true,
					message: "Join request sent successfully",
				});
			}

			// If regular form submission
			return res.redirect("/groups");
		} catch (error) {
			console.error("Error requesting to join group:", error);

			// If AJAX request
			if (req.xhr) {
				return res.status(400).json({
					success: false,
					message: error.message || "Failed to request joining group",
				});
			}

			// If regular form submission
			return res.status(400).render("groups", {
				title: "Browse Groups",
				error: error.message || "Failed to request joining group",
			});
		}
	})
);

/**
 * POST /groups/pendingUsers - Get pending users for a group
 */
router.route("/pendingUsers").post(
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			const userId = req.session.user._id;
			const { groupId } = req.body;

			if (!groupId) {
				throw new ValidationError("Group ID is required");
			}

			// Get pending users for group
			const pendingUsers = await groupData.getPendingUsersForGroup(
				groupId,
				userId
			);

			return res.json(pendingUsers);
		} catch (error) {
			console.error("Error getting pending users:", error);
			return res.status(400).json({
				success: false,
				message: error.message || "Failed to get pending users",
			});
		}
	})
);

/**
 * POST /groups/approvedUsers - Get approved users for a group
 */
router.route("/approvedUsers").post(
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			const userId = req.session.user._id;
			const { groupId } = req.body;

			if (!groupId) {
				throw new ValidationError("Group ID is required");
			}

			// Get joined users for group
			const approvedUsers = await groupData.getJoinedUsers(
				groupId,
				userId
			);

			return res.json(approvedUsers);
		} catch (error) {
			console.error("Error getting approved users:", error);
			return res.status(400).json({
				success: false,
				message: error.message || "Failed to get approved users",
			});
		}
	})
);

/**
 * POST /groups/acceptUser - Accept a user's request to join
 */
router.route("/acceptUser").post(
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			const userId = req.session.user._id;
			const { userId: targetUserId, groupId } = req.body;

			if (!targetUserId || !groupId) {
				throw new ValidationError("User ID and Group ID are required");
			}

			// Approve user
			await groupData.approveUser(userId, targetUserId, groupId);

			// If AJAX request
			if (req.xhr) {
				return res.json({
					success: true,
					message: "User approved successfully",
				});
			}

			// If regular form submission
			return res.redirect("/groups/myGroups");
		} catch (error) {
			console.error("Error approving user:", error);

			// If AJAX request
			if (req.xhr) {
				return res.status(400).json({
					success: false,
					message: error.message || "Failed to approve user",
				});
			}

			// If regular form submission
			return res.status(400).render("mygroups", {
				title: "My Groups",
				error: error.message || "Failed to approve user",
			});
		}
	})
);

/**
 * POST /groups/rejectUser - Reject a user's request to join
 */
router.route("/rejectUser").post(
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			const userId = req.session._id;
			const { userId: targetUserId, groupId } = req.body;

			if (!targetUserId || !groupId) {
				throw new ValidationError("User ID and Group ID are required");
			}

			// Reject user
			await groupData.rejectUser(userId, targetUserId, groupId);

			// If AJAX request
			if (req.xhr) {
				return res.json({
					success: true,
					message: "User rejected successfully",
				});
			}

			// If regular form submission
			return res.redirect("/groups/myGroups");
		} catch (error) {
			console.error("Error rejecting user:", error);

			// If AJAX request
			if (req.xhr) {
				return res.status(400).json({
					success: false,
					message: error.message || "Failed to reject user",
				});
			}

			// If regular form submission
			return res.status(400).render("mygroups", {
				title: "My Groups",
				error: error.message || "Failed to reject user",
			});
		}
	})
);

/**
 * POST /groups/removeUser - Remove a user from a group
 */
router.route("/removeUser").post(
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			const userId = req.session.user._id;
			const { userId: targetUserId, groupId } = req.body;

			if (!targetUserId || !groupId) {
				throw new ValidationError("User ID and Group ID are required");
			}

			// Remove user
			await groupData.removeUser(userId, targetUserId, groupId);

			// If AJAX request
			if (req.xhr) {
				return res.json({
					success: true,
					message: "User removed successfully",
				});
			}

			// If regular form submission
			return res.redirect("/groups/myGroups");
		} catch (error) {
			console.error("Error removing user:", error);

			// If AJAX request
			if (req.xhr) {
				return res.status(400).json({
					success: false,
					message: error.message || "Failed to remove user",
				});
			}

			// If regular form submission
			return res.status(400).render("mygroups", {
				title: "My Groups",
				error: error.message || "Failed to remove user",
			});
		}
	})
);

/**
 * POST /groups/leave - Leave a group
 */
router.route("/leave").post(
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			const userId = req.session.user._id;
			const { groupId } = req.body;

			if (!groupId) {
				throw new ValidationError("Group ID is required");
			}

			// Leave group
			await groupData.leaveGroup(userId, groupId);

			// If AJAX request
			if (req.xhr) {
				return res.json({
					success: true,
					message: "Left group successfully",
				});
			}

			// If regular form submission
			return res.redirect("/groups/myGroups");
		} catch (error) {
			console.error("Error leaving group:", error);

			// If AJAX request
			if (req.xhr) {
				return res.status(400).json({
					success: false,
					message: error.message || "Failed to leave group",
				});
			}

			// If regular form submission
			return res.status(400).render("mygroups", {
				title: "My Groups",
				error: error.message || "Failed to leave group",
			});
		}
	})
);

/**
 * POST /groups/cancelReq - Cancel a join request
 */
router.route("/cancelReq").post(
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			const userId = req.session._id;
			const { groupId } = req.body;

			if (!groupId) {
				throw new ValidationError("Group ID is required");
			}

			// Cancel request
			await groupData.cancelRequest(userId, groupId);

			// If AJAX request
			if (req.xhr) {
				return res.json({
					success: true,
					message: "Request cancelled successfully",
				});
			}

			// If regular form submission
			return res.redirect("/groups/myGroups");
		} catch (error) {
			console.error("Error cancelling request:", error);

			// If AJAX request
			if (req.xhr) {
				return res.status(400).json({
					success: false,
					message: error.message || "Failed to cancel request",
				});
			}

			// If regular form submission
			return res.status(400).render("mygroups", {
				title: "My Groups",
				error: error.message || "Failed to cancel request",
			});
		}
	})
);

/**
 * POST /groups/deleteGroup - Delete a group
 */
router.route("/deleteGroup").post(
	ensureAuthenticated,
	asyncHandler(async (req, res) => {
		try {
			const userId = req.session.user._id;
			const { groupId } = req.body;

			if (!groupId) {
				throw new ValidationError("Group ID is required");
			}

			// Delete group
			await groupData.deleteGroup(groupId, userId);

			// If AJAX request
			if (req.xhr) {
				return res.json({
					success: true,
					message: "Group deleted successfully",
				});
			}

			// If regular form submission
			return res.redirect("/groups/myGroups");
		} catch (error) {
			console.error("Error deleting group:", error);

			// If AJAX request
			if (req.xhr) {
				return res.status(400).json({
					success: false,
					message: error.message || "Failed to delete group",
				});
			}

			// If regular form submission
			return res.status(400).render("mygroups", {
				title: "My Groups",
				error: error.message || "Failed to delete group",
			});
		}
	})
);

export default router;
