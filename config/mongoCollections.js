import { dbConnection } from "./mongoConnection.js";

const getCollectionFn = (collection) => {
	let _col = undefined;

	return async () => {
		if (!_col) {
			const db = await dbConnection();
			_col = await db.collection(collection);
		}

		return _col;
	};
};

export const users = getCollectionFn("users");
export const admin = getCollectionFn("admin");
export const busers = getCollectionFn("business");
export const badges = getCollectionFn("badges");
export const userBadges = getCollectionFn("userBadges");
export const groups = getCollectionFn("groups");
export const schedule = getCollectionFn("schedule");
export const reviews = getCollectionFn("reviews");
