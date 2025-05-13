/**
 * Helper functions for formatting and displaying reviews consistently across the application
 */

/**
 * Generates HTML for displaying star ratings
 * @param {number} rating - Rating value (1-5)
 * @param {number} maxRating - Maximum rating (default: 5)
 * @param {boolean} includeCounts - Whether to include the numeric rating value
 * @returns {string} HTML for star display
 */
export const formatStars = (rating, maxRating = 5, includeCounts = true) => {
	if (!rating)
		return '<div class="stars-display"><span class="no-rating">No ratings yet</span></div>';

	let starsHtml = '<div class="stars-display">';

	// Add filled and empty stars
	for (let i = 1; i <= maxRating; i++) {
		starsHtml += `<span class="star ${
			i <= rating ? "filled" : ""
		}">★</span>`;
	}

	starsHtml += "</div>";

	// Add numeric display if requested
	if (includeCounts) {
		starsHtml += `<span class="rating-number">${rating.toFixed(
			1
		)}/5</span>`;
	}

	return starsHtml;
};

/**
 * Calculate average rating from an array of reviews
 * @param {Array} reviews - Array of review objects
 * @returns {number} Average rating (rounded to 1 decimal place)
 */
export const calculateAverageRating = (reviews) => {
	if (!reviews || reviews.length === 0) return 0;

	const sum = reviews.reduce((total, review) => total + review.rating, 0);
	return parseFloat((sum / reviews.length).toFixed(1));
};

/**
 * Format review date in a consistent way
 * @param {string|Date} date - Date to format
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
export const formatReviewDate = (date, includeTime = false) => {
	if (!date) return "";

	const reviewDate = new Date(date);
	if (isNaN(reviewDate.getTime())) return "";

	const options = {
		year: "numeric",
		month: "short",
		day: "numeric",
	};

	if (includeTime) {
		options.hour = "2-digit";
		options.minute = "2-digit";
	}

	return reviewDate.toLocaleDateString("en-US", options);
};

/**
 * Get statistics for a set of reviews
 * @param {Array} reviews - Array of review objects
 * @returns {Object} Review statistics
 */
export const getReviewStats = (reviews) => {
	if (!reviews || reviews.length === 0) {
		return {
			count: 0,
			average: 0,
			distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
		};
	}

	// Calculate rating distribution
	const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
	reviews.forEach((review) => {
		const rating = Math.floor(review.rating);
		if (distribution[rating] !== undefined) {
			distribution[rating]++;
		}
	});

	// Get the most common rating
	let mostCommonRating = 0;
	let highestCount = 0;

	Object.entries(distribution).forEach(([rating, count]) => {
		if (count > highestCount) {
			mostCommonRating = parseInt(rating);
			highestCount = count;
		}
	});

	return {
		count: reviews.length,
		average: calculateAverageRating(reviews),
		distribution: distribution,
		mostCommonRating: mostCommonRating,
	};
};

/**
 * Get the HTML for a review author section
 * @param {Object} reviewer - Reviewer object with firstName, lastName, profilePicture
 * @param {Date|string} date - Review date
 * @returns {string} HTML for the reviewer section
 */
export const formatReviewerInfo = (reviewer, date) => {
	if (!reviewer) return "";

	const profilePic =
		reviewer.profilePicture || "/public/images/default-profile.png";
	const formattedDate = formatReviewDate(date);

	return `
    <div class="reviewer-info">
      <img src="${profilePic}" alt="${reviewer.userName}" class="reviewer-image">
      <div>
        <h3>${reviewer.firstName} ${reviewer.lastName}</h3>
        <p class="review-date">${formattedDate}</p>
      </div>
    </div>
  `;
};

/**
 * Format the comment part of a review
 * @param {string} comment - Review comment
 * @returns {string} Formatted comment HTML
 */
export const formatReviewComment = (comment) => {
	if (!comment || comment.trim() === "") {
		return '<div class="review-comment empty"><p>No comment provided</p></div>';
	}

	return `<div class="review-comment"><p>${comment}</p></div>`;
};

export default {
	formatStars,
	calculateAverageRating,
	formatReviewDate,
	getReviewStats,
	formatReviewerInfo,
	formatReviewComment,
};
