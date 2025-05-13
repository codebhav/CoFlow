import { Router } from "express";
const router = Router();
import * as reviewData from "../data/reviews.js";
import * as userData from "../data/user.js";
import * as groupData from "../data/groups.js";
import middleware from "../middleware.js";
import { ValidationError, NotFoundError } from "../utils/error-utils.js";
import { asyncHandler } from "../utils/error-utils.js";
import { ensureAuthenticated } from "../middleware/auth-middleware.js";

/**
 * GET /reviews - Show reviews dashboard
 */
router.get(
    "/",
    ensureAuthenticated,
    asyncHandler(async (req, res) => {
        try {
            const userId = req.session.user.id;
            
            // Get reviews given by the user
            const reviewsGiven = await reviewData.getReviewsByReviewer(userId);
            
            // Get reviews received by the user
            const reviewsReceived = await reviewData.getReviewsForUser(userId);
            
            // Get user data for reviewers and targets
            const userIds = new Set();
            reviewsGiven.forEach(review => userIds.add(review.targetId));
            reviewsReceived.forEach(review => userIds.add(review.reviewerId));
            
            const userMap = {};
            for (const id of userIds) {
                const user = await userData.findUserById(id);
                if (user) {
                    userMap[id] = {
                        userName: user.userName,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        profilePicture: user.profilePicture || "/public/images/default-profile.png"
                    };
                }
            }
            
            // Get group data
            const groupIds = new Set();
            reviewsGiven.forEach(review => groupIds.add(review.groupId));
            reviewsReceived.forEach(review => groupIds.add(review.groupId));
            
            const groupMap = {};
            for (const id of groupIds) {
                const group = await groupData.getGroupById(id);
                if (group) {
                    groupMap[id] = {
                        groupName: group.groupName,
                        course: group.course
                    };
                }
            }
            
            res.render("reviews-dashboard", {
                title: "Reviews Dashboard",
                user: req.session.user,
                reviewsGiven: reviewsGiven,
                reviewsReceived: reviewsReceived,
                userMap: userMap,
                groupMap: groupMap
            });
        } catch (error) {
            console.error("Error loading reviews dashboard:", error);
            res.status(500).render("error", {
                title: "Error",
                message: "Failed to load reviews dashboard"
            });
        }
    })
);

/**
 * GET /reviews/new/:groupId - Show form to create a new review
 */
router.get(
    "/new/:groupId",
    ensureAuthenticated,
    asyncHandler(async (req, res) => {
        try {
            const groupId = req.params.groupId;
            const userId = req.session.user.id;
            
            // Validate group ID
            if (!groupId) {
                throw new ValidationError("Group ID is required");
            }
            
            // Get group data
            const group = await groupData.getGroupById(groupId);
            if (!group) {
                throw new NotFoundError("Group not found");
            }
            
            // Check if user is a member of the group
            if (!group.members.includes(userId)) {
                throw new ValidationError("You must be a member of the group to review other members");
            }
            
            // Get eligible users for review
            const eligibleUsers = await reviewData.getEligibleReviewUsers(groupId, userId);
            
            if (eligibleUsers.length === 0) {
                return res.render("review-form", {
                    title: "Write a Review",
                    group: group,
                    noEligibleUsers: true,
                    message: "You have already reviewed all members of this group."
                });
            }
            
            res.render("review-form", {
                title: "Write a Review",
                group: group,
                eligibleUsers: eligibleUsers
            });
        } catch (error) {
            console.error("Error loading review form:", error);
            
            if (error instanceof NotFoundError) {
                return res.status(404).render("error", {
                    title: "Group Not Found",
                    message: "The requested group does not exist"
                });
            }
            
            if (error instanceof ValidationError) {
                return res.status(400).render("error", {
                    title: "Error",
                    message: error.message
                });
            }
            
            res.status(500).render("error", {
                title: "Error",
                message: "Failed to load review form"
            });
        }
    })
);

/**
 * POST /reviews - Submit a new review
 */
router.post(
    "/",
    ensureAuthenticated,
    asyncHandler(async (req, res) => {
        try {
            const { groupId, targetId, rating, comment } = req.body;
            const reviewerId = req.session.user.id;
            
            // Create the review
            await reviewData.createReview(groupId, reviewerId, targetId, rating, comment);
            
            // Redirect to reviews dashboard with success message
            req.session.success = "Review submitted successfully";
            res.redirect("/reviews");
        } catch (error) {
            console.error("Error creating review:", error);
            
            if (error instanceof ValidationError || error instanceof NotFoundError) {
                // If there's a validation error, re-render the form with the error
                try {
                    const groupId = req.body.groupId;
                    const group = await groupData.getGroupById(groupId);
                    const eligibleUsers = await reviewData.getEligibleReviewUsers(groupId, req.session.user.id);
                    
                    return res.status(400).render("review-form", {
                        title: "Write a Review",
                        group: group,
                        eligibleUsers: eligibleUsers,
                        error: error.message,
                        formData: req.body
                    });
                } catch (e) {
                    // If we can't get the group, redirect to error page
                    return res.status(400).render("error", {
                        title: "Error",
                        message: error.message
                    });
                }
            }
            
            res.status(500).render("error", {
                title: "Error",
                message: "Failed to submit review"
            });
        }
    })
);

/**
 * GET /reviews/edit/:id - Show form to edit a review
 */
router.get(
    "/edit/:id",
    ensureAuthenticated,
    asyncHandler(async (req, res) => {
        try {
            const reviewId = req.params.id;
            const userId = req.session.user.id;
            
            // Get review data
            const review = await reviewData.getReviewById(reviewId);
            
            // Check if user is the reviewer
            if (review.reviewerId !== userId) {
                throw new ValidationError("You can only edit your own reviews");
            }
            
            // Get target user info
            const targetUser = await userData.findUserById(review.targetId);
            
            // Get group info
            const group = await groupData.getGroupById(review.groupId);
            
            res.render("edit-review", {
                title: "Edit Review",
                review: review,
                targetUser: targetUser,
                group: group
            });
        } catch (error) {
            console.error("Error loading edit review form:", error);
            
            if (error instanceof NotFoundError) {
                return res.status(404).render("error", {
                    title: "Review Not Found",
                    message: "The requested review does not exist"
                });
            }
            
            if (error instanceof ValidationError) {
                return res.status(403).render("error", {
                    title: "Access Denied",
                    message: error.message
                });
            }
            
            res.status(500).render("error", {
                title: "Error",
                message: "Failed to load edit form"
            });
        }
    })
);

/**
 * POST /reviews/edit/:id - Update a review
 */
router.post(
    "/edit/:id",
    ensureAuthenticated,
    asyncHandler(async (req, res) => {
        try {
            const reviewId = req.params.id;
            const { rating, comment } = req.body;
            const userId = req.session.user.id;
            
            // Update the review
            await reviewData.updateReview(reviewId, userId, rating, comment);
            
            // Redirect to reviews dashboard with success message
            req.session.success = "Review updated successfully";
            res.redirect("/reviews");
        } catch (error) {
            console.error("Error updating review:", error);
            
            if (error instanceof ValidationError || error instanceof NotFoundError) {
                // If there's a validation error, re-render the form with the error
                try {
                    const reviewId = req.params.id;
                    const review = await reviewData.getReviewById(reviewId);
                    const targetUser = await userData.findUserById(review.targetId);
                    const group = await groupData.getGroupById(review.groupId);
                    
                    return res.status(400).render("edit-review", {
                        title: "Edit Review",
                        review: review,
                        targetUser: targetUser,
                        group: group,
                        error: error.message,
                        formData: req.body
                    });
                } catch (e) {
                    // If we can't get the review, redirect to error page
                    return res.status(400).render("error", {
                        title: "Error",
                        message: error.message
                    });
                }
            }
            
            res.status(500).render("error", {
                title: "Error",
                message: "Failed to update review"
            });
        }
    })
);

/**
 * POST /reviews/delete/:id - Delete a review
 */
router.post(
    "/delete/:id",
    ensureAuthenticated,
    asyncHandler(async (req, res) => {
        try {
            const reviewId = req.params.id;
            const userId = req.session.user.id;
            
            // Delete the review
            await reviewData.deleteReview(reviewId, userId);
            
            // Redirect to reviews dashboard with success message
            req.session.success = "Review deleted successfully";
            res.redirect("/reviews");
        } catch (error) {
            console.error("Error deleting review:", error);
            
            if (error instanceof ValidationError || error instanceof NotFoundError) {
                return res.status(400).render("error", {
                    title: "Error",
                    message: error.message
                });
            }
            
            res.status(500).render("error", {
                title: "Error",
                message: "Failed to delete review"
            });
        }
    })
);

/**
 * GET /reviews/user/:id - View reviews for a specific user
 */
router.get(
    "/user/:id",
    ensureAuthenticated,
    asyncHandler(async (req, res) => {
        try {
            const targetId = req.params.id;
            
            // Get user data
            const user = await userData.findUserById(targetId);
            if (!user) {
                throw new NotFoundError("User not found");
            }
            
            // Get all reviews for the user
            const userReviews = await reviewData.getReviewsForUser(targetId);
            
            // Get reviewer data
            const reviewerIds = userReviews.map(review => review.reviewerId);
            const reviewers = {};
            
            for (const id of reviewerIds) {
                const reviewer = await userData.findUserById(id);
                if (reviewer) {
                    reviewers[id] = {
                        userName: reviewer.userName,
                        firstName: reviewer.firstName,
                        lastName: reviewer.lastName,
                        profilePicture: reviewer.profilePicture || "/public/images/default-profile.png"
                    };
                }
            }
            
            // Get group data
            const groupIds = userReviews.map(review => review.groupId);
            const groups = {};
            
            for (const id of groupIds) {
                const group = await groupData.getGroupById(id);
                if (group) {
                    groups[id] = {
                        groupName: group.groupName,
                        course: group.course
                    };
                }
            }
            
            res.render("user-reviews", {
                title: `Reviews for ${user.userName}`,
                targetUser: user,
                reviews: userReviews,
                reviewers: reviewers,
                groups: groups,
                currentUser: req.session.user
            });
        } catch (error) {
            console.error("Error getting user reviews:", error);
            
            if (error instanceof NotFoundError) {
                return res.status(404).render("error", {
                    title: "User Not Found",
                    message: "The requested user does not exist"
                });
            }
            
            res.status(500).render("error", {
                title: "Error",
                message: "Failed to load user reviews"
            });
        }
    })
);

/**
 * GET /reviews/group/:id - View all reviews for a group
 */
router.get(
    "/group/:id",
    ensureAuthenticated,
    asyncHandler(async (req, res) => {
        try {
            const groupId = req.params.id;
            
            // Get group data
            const group = await groupData.getGroupById(groupId);
            if (!group) {
                throw new NotFoundError("Group not found");
            }
            
            // Get all reviews for the group
            const groupReviews = await reviewData.getReviewsByGroup(groupId);
            
            // Get user data for reviewers and targets
            const userIds = new Set();
            groupReviews.forEach(review => {
                userIds.add(review.reviewerId);
                userIds.add(review.targetId);
            });
            
            const users = {};
            for (const id of userIds) {
                const user = await userData.findUserById(id);
                if (user) {
                    users[id] = {
                        userName: user.userName,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        profilePicture: user.profilePicture || "/public/images/default-profile.png"
                    };
                }
            }
            
            res.render("group-reviews", {
                title: `Reviews for ${group.groupName}`,
                group: group,
                reviews: groupReviews,
                users: users,
                currentUser: req.session.user
            });
        } catch (error) {
            console.error("Error getting group reviews:", error);
            
            if (error instanceof NotFoundError) {
                return res.status(404).render("error", {
                    title: "Group Not Found",
                    message: "The requested group does not exist"
                });
            }
            
            res.status(500).render("error", {
                title: "Error",
                message: "Failed to load group reviews"
            });
        }
    })
);

export default router;