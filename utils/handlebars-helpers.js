/**
 * Custom Handlebars helpers for template rendering
 * Import and register these in app.js
 */

/**
 * Helper to safely render raw HTML content (dangerous, use cautiously)
 * Only use for trusted content or after sanitization
 * @param {string} content - HTML content to render
 * @returns {Handlebars.SafeString} - Safe HTML string
 */
export const safe = (content) => {
	if (!content) return "";
	return new Handlebars.SafeString(content);
};

/**
 * Helper to escape HTML content (default behavior)
 * @param {string} content - Content to escape
 * @returns {string} - Escaped content
 */
export const escape = (content) => {
	if (!content) return "";
	return Handlebars.escapeExpression(content);
};

/**
 * Helper to format dates
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
	if (!date) return "";
	const d = new Date(date);
	if (isNaN(d.getTime())) return "";
	return d.toLocaleDateString();
};

/**
 * Helper to format time
 * @param {string|Date} date - Date/time to format
 * @returns {string} - Formatted time string
 */
export const formatTime = (date) => {
	if (!date) return "";
	const d = new Date(date);
	if (isNaN(d.getTime())) return "";
	return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

/**
 * Helper to format date and time together
 * @param {string|Date} date - Date/time to format
 * @returns {string} - Formatted date and time string
 */
export const formatDateTime = (date) => {
	if (!date) return "";
	const d = new Date(date);
	if (isNaN(d.getTime())) return "";
	return d.toLocaleString();
};

/**
 * Helper to format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount, currency = "USD") => {
	if (amount === undefined || amount === null) return "";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency,
	}).format(amount);
};

/**
 * Helper to truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} - Truncated text
 */
export const truncate = (text, length) => {
	if (!text) return "";
	if (text.length <= length) return text;
	return text.substring(0, length) + "...";
};

/**
 * Helper to convert text to lowercase
 * @param {string} text - Text to convert
 * @returns {string} - Lowercase text
 */
export const toLowerCase = (text) => {
	if (!text) return "";
	return text.toLowerCase();
};

/**
 * Helper to convert text to uppercase
 * @param {string} text - Text to convert
 * @returns {string} - Uppercase text
 */
export const toUpperCase = (text) => {
	if (!text) return "";
	return text.toUpperCase();
};

/**
 * Helper to capitalize first letter of text
 * @param {string} text - Text to capitalize
 * @returns {string} - Capitalized text
 */
export const capitalize = (text) => {
	if (!text) return "";
	return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Helper to check if value is in array
 * @param {*} item - Item to check
 * @param {Array} array - Array to check in
 * @returns {boolean} - True if item is in array
 */
export const inArray = (item, array) => {
	return array && array.includes(item);
};

/**
 * Helper to generate a list of numbers (for pagination)
 * @param {number} start - Start number
 * @param {number} end - End number
 * @returns {Array} - Array of numbers
 */
export const range = (start, end) => {
	const result = [];
	for (let i = start; i <= end; i++) {
		result.push(i);
	}
	return result;
};

/**
 * Helper to check equality between two values
 * @param {*} v1 - First value
 * @param {*} v2 - Second value
 * @returns {boolean} - True if values are equal
 */
export const eq = (v1, v2) => {
	return v1 === v2;
};

/**
 * Helper to check inequality between two values
 * @param {*} v1 - First value
 * @param {*} v2 - Second value
 * @returns {boolean} - True if values are not equal
 */
export const ne = (v1, v2) => {
	return v1 !== v2;
};

/**
 * Helper to check if v1 is greater than v2
 * @param {*} v1 - First value
 * @param {*} v2 - Second value
 * @returns {boolean} - True if v1 > v2
 */
export const gt = (v1, v2) => {
	return v1 > v2;
};

/**
 * Helper to check if v1 is greater than or equal to v2
 * @param {*} v1 - First value
 * @param {*} v2 - Second value
 * @returns {boolean} - True if v1 >= v2
 */
export const gte = (v1, v2) => {
	return v1 >= v2;
};

/**
 * Helper to check if v1 is less than v2
 * @param {*} v1 - First value
 * @param {*} v2 - Second value
 * @returns {boolean} - True if v1 < v2
 */
export const lt = (v1, v2) => {
	return v1 < v2;
};

/**
 * Helper to check if v1 is less than or equal to v2
 * @param {*} v1 - First value
 * @param {*} v2 - Second value
 * @returns {boolean} - True if v1 <= v2
 */
export const lte = (v1, v2) => {
	return v1 <= v2;
};

/**
 * Helper to add two numbers
 * @param {number} v1 - First number
 * @param {number} v2 - Second number
 * @returns {number} - Sum of v1 and v2
 */
export const add = (v1, v2) => {
	return v1 + v2;
};

/**
 * Helper to subtract v2 from v1
 * @param {number} v1 - First number
 * @param {number} v2 - Second number
 * @returns {number} - Difference of v1 and v2
 */
export const subtract = (v1, v2) => {
	return v1 - v2;
};

/**
 * Helper to multiply two numbers
 * @param {number} v1 - First number
 * @param {number} v2 - Second number
 * @returns {number} - Product of v1 and v2
 */
export const multiply = (v1, v2) => {
	return v1 * v2;
};

/**
 * Helper to divide v1 by v2
 * @param {number} v1 - First number
 * @param {number} v2 - Second number
 * @returns {number} - Quotient of v1 and v2
 */
export const divide = (v1, v2) => {
	return v1 / v2;
};

/**
 * Helper to get current year
 * @returns {number} - Current year
 */
export const getCurrentYear = () => {
	return new Date().getFullYear();
};

/**
 * Helper to convert object to JSON string
 * @param {Object} context - Object to convert
 * @returns {string} - JSON string
 */
export const json = (context) => {
	return JSON.stringify(context);
};

export default {
	safe,
	escape,
	formatDate,
	formatTime,
	formatDateTime,
	formatCurrency,
	truncate,
	toLowerCase,
	toUpperCase,
	capitalize,
	inArray,
	range,
	eq,
	ne,
	gt,
	gte,
	lt,
	lte,
	add,
	subtract,
	multiply,
	divide,
	getCurrentYear,
	json,
};
