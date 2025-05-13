/**
 * Standardized error handling utilities
 */

// Custom error classes
export class ValidationError extends Error {
	constructor(message) {
		super(message);
		this.name = "ValidationError";
		this.status = 400;
	}
}

export class AuthenticationError extends Error {
	constructor(message) {
		super(message);
		this.name = "AuthenticationError";
		this.status = 401;
	}
}

export class AuthorizationError extends Error {
	constructor(message) {
		super(message);
		this.name = "AuthorizationError";
		this.status = 403;
	}
}

export class NotFoundError extends Error {
	constructor(message) {
		super(message);
		this.name = "NotFoundError";
		this.status = 404;
	}
}

export class ConflictError extends Error {
	constructor(message) {
		super(message);
		this.name = "ConflictError";
		this.status = 409;
	}
}

export class InternalError extends Error {
	constructor(message) {
		super(message);
		this.name = "InternalError";
		this.status = 500;
	}
}

/**
 * Determine if error should be shown to user
 * @param {Error} err - The error to check
 * @returns {boolean} - Whether the error is safe to display
 */
const isSafeError = (err) => {
	return (
		err instanceof ValidationError ||
		err instanceof NotFoundError ||
		err instanceof ConflictError ||
		err instanceof AuthenticationError ||
		err instanceof AuthorizationError
	);
};

/**
 * Get user-friendly error message
 * @param {Error} err - The error to process
 * @returns {string} - Safe error message for users
 */
export const getUserMessage = (err) => {
	if (isSafeError(err)) {
		return err.message;
	} else {
		// For non-safe errors, return a generic message
		console.error("Internal error:", err);
		return "An unexpected error occurred. Please try again later.";
	}
};

/**
 * Handle errors in route handlers
 * @param {Function} routeHandler - Async route handler function
 * @returns {Function} - Express middleware with error handling
 */
export const asyncHandler = (routeHandler) => {
	return async (req, res, next) => {
		try {
			await routeHandler(req, res, next);
		} catch (err) {
			// Log all errors
			console.error(`Error in route ${req.method} ${req.path}:`, err);

			// Determine status code
			const statusCode = err.status || 500;

			// For API routes that expect JSON
			if (req.xhr || req.path.startsWith("/api/")) {
				return res.status(statusCode).json({
					error: true,
					message: getUserMessage(err),
				});
			}

			// For regular routes that render templates
			return res.status(statusCode).render("error", {
				title: "Error",
				message: getUserMessage(err),
			});
		}
	};
};

export default {
	ValidationError,
	AuthenticationError,
	AuthorizationError,
	NotFoundError,
	ConflictError,
	InternalError,
	getUserMessage,
	asyncHandler,
};
