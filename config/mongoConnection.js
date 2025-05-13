import { MongoClient } from "mongodb";
import { mongoConfig } from "./settings.js";

let _connection = undefined;
let _db = undefined;

/**
 * Initialize the database connection if not already established
 * @returns {Promise} Promise that resolves to the connection
 */
const _initConnection = async () => {
	if (!_connection) {
		try {
			_connection = await MongoClient.connect(mongoConfig.serverUrl);
			_db = _connection.db(mongoConfig.database);
			console.log("Successfully connected to MongoDB");
		} catch (error) {
			console.error("Could not connect to MongoDB", error);
			throw error; // Re-throw to allow handling by caller
		}
	}
	return { connection: _connection, db: _db };
};

/**
 * Get database connection
 * @returns {Promise} Promise that resolves to the database
 */
export const dbConnection = async () => {
	const { db } = await _initConnection();
	return db;
};

/**
 * Get MongoDB client connection
 * @returns {Promise} Promise that resolves to the MongoDB client
 */
export const getMongoClient = async () => {
	const { connection } = await _initConnection();
	return connection;
};

/**
 * Close the database connection
 */
export const closeConnection = async () => {
	if (_connection) {
		try {
			await _connection.close();
			_connection = undefined;
			_db = undefined;
			console.log("MongoDB connection closed");
		} catch (error) {
			console.error("Error closing MongoDB connection", error);
			throw error;
		}
	}
};
