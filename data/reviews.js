import { reviews } from "../config/mongoCollections.js";
import { users } from "../config/mongoCollections.js";
import { groups } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";
import Validation from "../helpers.js";
import { ValidationError, NotFoundError } from "../utils/error-utils.js";

/**
 * Create a new review
 * @param {string} groupId - ID of the group where the interaction occurred
 * @param {string} reviewerId - ID of the user giving the review
 * @param {string} targetId - ID of the user being reviewed
 * @param {number} rating - Numeric rating (1-5)
 * @param {string} comment - Optional comment with feedback
 * @returns {Object} Created review
 */
export const createReview = async (groupId, reviewerId, targetId, rating, comment) => {
    try {
        // Validate required inputs
        if (!groupId || !reviewerId || !targetId || !rating) {
            throw new ValidationError("All required fields must be provided");
        }

        // Ensure reviewer can't review themselves
        if (reviewerId === targetId) {
            throw new ValidationError("You cannot review yourself");
        }

        // Validate and sanitize inputs
        groupId = Validation.checkId(groupId, "Group ID");
        reviewerId = Validation.checkId(reviewerId, "Reviewer ID");
        targetId = Validation.checkId(targetId, "Target ID");

        // Validate rating (1-5)
        if (typeof rating === "string") {
            rating = parseInt(rating);
        }
        
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            throw new ValidationError("Rating must be a number between 1 and 5");
        }

        // Validate comment (optional)
        if (comment) {
            comment = Validation.checkString(comment, "Comment");
        } else {
            comment = "";
        }

        // Check if group exists
        const groupsCollection = await groups();
        const group = await groupsCollection.findOne({ _id: new ObjectId(groupId) });
        if (!group) {
            throw new NotFoundError("Group not found");
        }

        // Check if reviewer is a member of the group
        if (!group.members.includes(reviewerId)) {
            throw new ValidationError("Reviewer must be a member of the group");
        }

        // Check if target is a member of the group
        if (!group.members.includes(targetId)) {
            throw new ValidationError("Target must be a member of the group");
        }

        // Check if review already exists for this group, reviewer, and target
        const reviewsCollection = await reviews();
        const existingReview = await reviewsCollection.findOne({
            groupId: new ObjectId(groupId),
            reviewerId: new ObjectId(reviewerId),
            targetId: new ObjectId(targetId)
        });

        if (existingReview) {
            throw new ValidationError("You have already reviewed this user for this group");
        }

        // Create new review object
        const newReview = {
            groupId: new ObjectId(groupId),
            reviewerId: new ObjectId(reviewerId),
            targetId: new ObjectId(targetId),
            rating: rating,
            comment: comment,
            timestamp: new Date().toISOString()
        };

        // Insert review into database
        const insertInfo = await reviewsCollection.insertOne(newReview);
        if (!insertInfo.insertedId) {
            throw new Error("Failed to insert review");
        }

        // Update target user's average rating
        await updateUserRating(targetId);

        // Return created review with string IDs
        const createdReview = await getReviewById(insertInfo.insertedId.toString());
        return createdReview;
    } catch (error) {
        if (error instanceof ValidationError || error instanceof NotFoundError) {
            throw error;
        }
        console.error("Error creating review:", error);
        throw new Error(`Failed to create review: ${error.message}`);
    }
};

/**
 * Get a review by ID
 * @param {string} reviewId - ID of review to retrieve
 * @returns {Object} Review object
 */
export const getReviewById = async (reviewId) => {
    try {
        reviewId = Validation.checkId(reviewId, "Review ID");

        const reviewsCollection = await reviews();
        const review = await reviewsCollection.findOne({ _id: new ObjectId(reviewId) });

        if (!review) {
            throw new NotFoundError("Review not found");
        }

        // Convert ObjectIds to strings
        review._id = review._id.toString();
        review.groupId = review.groupId.toString();
        review.reviewerId = review.reviewerId.toString();
        review.targetId = review.targetId.toString();

        return review;
    } catch (error) {
        if (error instanceof ValidationError || error instanceof NotFoundError) {
            throw error;
        }
        console.error("Error getting review by ID:", error);
        throw new Error(`Failed to get review: ${error.message}`);
    }
};

/**
 * Get all reviews for a group
 * @param {string} groupId - Group ID
 * @returns {Array} Array of review objects
 */
export const getReviewsByGroup = async (groupId) => {
    try {
        groupId = Validation.checkId(groupId, "Group ID");

        const reviewsCollection = await reviews();
        const groupReviews = await reviewsCollection.find({
            groupId: new ObjectId(groupId)
        }).toArray();

        // Convert ObjectIds to strings
        groupReviews.forEach(review => {
            review._id = review._id.toString();
            review.groupId = review.groupId.toString();
            review.reviewerId = review.reviewerId.toString();
            review.targetId = review.targetId.toString();
        });

        return groupReviews;
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        console.error("Error getting reviews by group:", error);
        throw new Error(`Failed to get group reviews: ${error.message}`);
    }
};

/**
 * Get all reviews by a specific reviewer
 * @param {string} reviewerId - Reviewer's user ID
 * @returns {Array} Array of review objects
 */
export const getReviewsByReviewer = async (reviewerId) => {
    try {
        reviewerId = Validation.checkId(reviewerId, "Reviewer ID");

        const reviewsCollection = await reviews();
        const userReviews = await reviewsCollection.find({
            reviewerId: new ObjectId(reviewerId)
        }).toArray();

        // Convert ObjectIds to strings
        userReviews.forEach(review => {
            review._id = review._id.toString();
            review.groupId = review.groupId.toString();
            review.reviewerId = review.reviewerId.toString();
            review.targetId = review.targetId.toString();
        });

        return userReviews;
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        console.error("Error getting reviews by reviewer:", error);
        throw new Error(`Failed to get reviewer's reviews: ${error.message}`);
    }
};

/**
 * Get all reviews for a specific target user
 * @param {string} targetId - Target user's ID
 * @returns {Array} Array of review objects
 */
export const getReviewsForUser = async (targetId) => {
    try {
        targetId = Validation.checkId(targetId, "Target ID");

        const reviewsCollection = await reviews();
        const userReviews = await reviewsCollection.find({
            targetId: new ObjectId(targetId)
        }).toArray();

        // Convert ObjectIds to strings
        userReviews.forEach(review => {
            review._id = review._id.toString();
            review.groupId = review.groupId.toString();
            review.reviewerId = review.reviewerId.toString();
            review.targetId = review.targetId.toString();
        });

        return userReviews;
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        console.error("Error getting reviews for user:", error);
        throw new Error(`Failed to get user's reviews: ${error.message}`);
    }
};

/**
 * Update a review
 * @param {string} reviewId - ID of review to update
 * @param {string} reviewerId - ID of reviewer (for validation)
 * @param {number} rating - New rating value
 * @param {string} comment - New comment
 * @returns {Object} Updated review
 */
export const updateReview = async (reviewId, reviewerId, rating, comment) => {
    try {
        reviewId = Validation.checkId(reviewId, "Review ID");
        reviewerId = Validation.checkId(reviewerId, "Reviewer ID");

        // Get existing review
        const currentReview = await getReviewById(reviewId);

        // Verify reviewer owns this review
        if (currentReview.reviewerId !== reviewerId) {
            throw new ValidationError("You can only update your own reviews");
        }

        // Prepare update object
        const updates = {};

        // Validate and add rating if provided
        if (rating !== undefined) {
            if (typeof rating === "string") {
                rating = parseInt(rating);
            }
            
            if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
                throw new ValidationError("Rating must be a number between 1 and 5");
            }
            
            updates.rating = rating;
        }

        // Validate and add comment if provided
        if (comment !== undefined) {
            if (comment) {
                comment = Validation.checkString(comment, "Comment");
            } else {
                comment = "";
            }
            
            updates.comment = comment;
        }

        // Add timestamp for the update
        updates.timestamp = new Date().toISOString();

        // If no updates, return current review
        if (Object.keys(updates).length === 0) {
            return currentReview;
        }

        // Update the review in database
        const reviewsCollection = await reviews();
        const updateResult = await reviewsCollection.updateOne(
            { _id: new ObjectId(reviewId) },
            { $set: updates }
        );

        if (updateResult.modifiedCount === 0) {
            throw new Error("Failed to update review");
        }

        // If rating changed, update target user's average rating
        if (updates.rating !== undefined) {
            await updateUserRating(currentReview.targetId);
        }

        // Return updated review
        return await getReviewById(reviewId);
    } catch (error) {
        if (error instanceof ValidationError || error instanceof NotFoundError) {
            throw error;
        }
        console.error("Error updating review:", error);
        throw new Error(`Failed to update review: ${error.message}`);
    }
};

/**
 * Delete a review
 * @param {string} reviewId - ID of review to delete
 * @param {string} reviewerId - ID of reviewer (for validation)
 * @returns {Object} Result of deletion
 */
export const deleteReview = async (reviewId, reviewerId) => {
    try {
        reviewId = Validation.checkId(reviewId, "Review ID");
        reviewerId = Validation.checkId(reviewerId, "Reviewer ID");

        // Get existing review
        const review = await getReviewById(reviewId);

        // Verify reviewer owns this review
        if (review.reviewerId !== reviewerId) {
            throw new ValidationError("You can only delete your own reviews");
        }

        // Store target ID for rating update after deletion
        const targetId = review.targetId;

        // Delete the review
        const reviewsCollection = await reviews();
        const deleteResult = await reviewsCollection.deleteOne({
            _id: new ObjectId(reviewId)
        });

        if (deleteResult.deletedCount === 0) {
            throw new Error("Failed to delete review");
        }

        // Update target user's average rating
        await updateUserRating(targetId);

        return {
            deleted: true,
            reviewId: reviewId,
            message: "Review deleted successfully"
        };
    } catch (error) {
        if (error instanceof ValidationError || error instanceof NotFoundError) {
            throw error;
        }
        console.error("Error deleting review:", error);
        throw new Error(`Failed to delete review: ${error.message}`);
    }
};

/**
 * Calculate and update a user's average rating
 * @param {string} userId - User ID to update rating for
 * @returns {number} New average rating
 */
export const updateUserRating = async (userId) => {
    try {
        userId = Validation.checkId(userId, "User ID");

        // Get all reviews for the user
        const reviewsCollection = await reviews();
        const userReviews = await reviewsCollection.find({
            targetId: new ObjectId(userId)
        }).toArray();

        // Calculate average rating
        let averageRating = 0;
        if (userReviews.length > 0) {
            const totalRating = userReviews.reduce((sum, review) => sum + review.rating, 0);
            averageRating = parseFloat((totalRating / userReviews.length).toFixed(1));
        }

        // Update user's rating in the database
        const usersCollection = await users();
        const updateResult = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { rating: averageRating } }
        );

        if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
            throw new Error("Failed to update user rating");
        }

        return averageRating;
    } catch (error) {
        console.error("Error updating user rating:", error);
        // Don't throw here to prevent breaking review creation/update/deletion
        return 0;
    }
};

/**
 * Get eligible users for review in a group
 * @param {string} groupId - Group ID
 * @param {string} userId - Current user ID
 * @returns {Array} Array of users eligible for review
 */
export const getEligibleReviewUsers = async (groupId, userId) => {
    try {
        groupId = Validation.checkId(groupId, "Group ID");
        userId = Validation.checkId(userId, "User ID");

        // Get group data
        const groupsCollection = await groups();
        const group = await groupsCollection.findOne({ _id: new ObjectId(groupId) });

        if (!group) {
            throw new NotFoundError("Group not found");
        }

        // Check if user is a member of the group
        if (!group.members.includes(userId)) {
            throw new ValidationError("You must be a member of the group to review other members");
        }

        // Get reviews already submitted by the user in this group
        const reviewsCollection = await reviews();
        const userReviews = await reviewsCollection.find({
            groupId: new ObjectId(groupId),
            reviewerId: new ObjectId(userId)
        }).toArray();

        // Extract users who have already been reviewed
        const reviewedUserIds = userReviews.map(review => review.targetId.toString());

        // Filter out the current user and already reviewed users
        const eligibleUsers = group.members.filter(memberId => 
            memberId !== userId && !reviewedUserIds.includes(memberId)
        );

        // Get user details for eligible users
        const usersCollection = await users();
        const eligibleUserDetails = await usersCollection.find({
            _id: { $in: eligibleUsers.map(id => new ObjectId(id)) }
        }).project({
            _id: 1,
            userName: 1,
            firstName: 1,
            lastName: 1,
            profilePicture: 1
        }).toArray();

        // Convert ObjectIds to strings
        eligibleUserDetails.forEach(user => {
            user._id = user._id.toString();
        });

        return eligibleUserDetails;
    } catch (error) {
        if (error instanceof ValidationError || error instanceof NotFoundError) {
            throw error;
        }
        console.error("Error getting eligible review users:", error);
        throw new Error(`Failed to get eligible users: ${error.message}`);
    }
};

export default {
    createReview,
    getReviewById,
    getReviewsByGroup,
    getReviewsByReviewer,
    getReviewsForUser,
    updateReview,
    deleteReview,
    updateUserRating,
    getEligibleReviewUsers
};