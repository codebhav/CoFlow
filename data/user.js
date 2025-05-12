import { users } from '../config/mongoCollections.js'
import * as admindata from './admin.js'
import Validation from '../helpers.js'
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';

async function createUser(userName, firstName, lastName, email, hashedPassword, bio, gender, city, state, dob, courses, education, terms, privacy) {
    if (!userName ||
        !firstName ||
        !lastName ||
        !email ||
        !hashedPassword ||
        !terms ||
        !privacy
    )
        throw 'basic info fields need to have valid values';

    userName = Validation.checkString(userName, "Validate username");
    firstName = Validation.checkString(firstName, "Validate firstName").toLowerCase();
    lastName = Validation.checkString(lastName, "Validate lastName").toLowerCase();
    email = Validation.checkEmail(email).toLowerCase();
    hashedPassword = Validation.checkString(hashedPassword, "hashedPassword");

    bio = bio ? Validation.checkString(bio, "bio") : '';
    gender = gender ? Validation.checkGender(gender, "gender") : '';
    city = city ? Validation.checkString(city, "city") : '';
    state = state ? Validation.checkString(state, "state") : '';
    dob = dob ? Validation.checkDate(dob) : '';
    courses = courses ? Validation.checkStringArray(courses) : [];
    education = education ? Validation.checkEducation(education) : [];
    if (terms != 'on' || privacy != 'on') throw 'privacy and term must be agreed'

    const userCollection = await users();
    let findName = await findUserByUsername(userName);
    if (findName) throw "userName already exist"
    let findemail = await findUserByEmail(email);
    if (findemail) throw "email already exist"

    let newuser = {
        userName: userName,
        firstName: firstName,
        lastName: lastName,
        email: email,
        hashedPassword: hashedPassword,
        bio: bio,
        gender: gender,
        state: state,
        city: city,
        age: dob != '' ? Validation.getAge(dob) : '',
        dob: dob,
        courses: courses,
        education: education,
        terms: terms,
        privacy: privacy,
        profilePicture: '',
        rating: 0,
        badgeIds: [],
        schedule: [],
        notificationSettings: {},
        createdGroups: [],
        joinedGroups: [],
        pendingGroups: [],
        role: "user"

    }


    const newInsertInformation = await userCollection.insertOne(newuser);
    if (!newInsertInformation.insertedId) throw 'Insert failed!';
    var res = await addBadge(userName, ["newUser"]);
    if (!res) throw "Fail to add newUser badge"
    return await this.findUserById(newInsertInformation.insertedId.toString());
};

async function findUserByUsername(username) {
    if (!username) throw 'You must provide an username to search for';
    username = Validation.checkString(username, "check username");
    const userCollection = await users();
    const findUser = await userCollection.findOne({ userName: username });
    if (findUser === null) return null;
    findUser._id = findUser._id.toString();
    return findUser;
};

async function findUserByEmail(email) {
    if (!email) throw 'You must provide an email to search for';
    email = Validation.checkEmail(email);
    const userCollection = await users();
    const findUser = await userCollection.findOne({ email: email });
    if (findUser === null) return null;
    findUser._id = findUser._id.toString();
    return findUser;
};

async function findUserById(userId) {
    if (!userId) throw 'You must provide an userId to search for';
    userId = Validation.checkId(userId);
    const userCollection = await users();
    const findUser = await userCollection.findOne({ _id: new ObjectId(userId) });
    if (findUser === null) return null;
    findUser._id = findUser._id.toString();
    return findUser;
};

async function getAllUsers() {
    const userCollection = await users();
    const userList = await userCollection.find({}).toArray();
    userList.forEach((element) => {
        element._id = element._id.toString();
    });
    return userList;
};

async function updateUserProfile(lastuserName, userName, firstName, lastName, email, bio, gender, state, city, dob, courses, education, profilePicture) {
    console.log(profilePicture);
    if (!userName ||
        !firstName ||
        !lastName ||
        !email ||
        !lastuserName
    ) throw 'basic info fields need to have valid values';

    var originUserData = await this.findUserByUsername(lastuserName);
    if (!originUserData) {
        return res.render('profile', { title: 'Profile', error: 'originalUsername not exists.' });
    }
    var { _id, ...originUser } = originUserData;

    const existingUsername = await this.findUserByUsername(userName);
    if (existingUsername && (userName != lastuserName)) {
        return res.render('profile', { title: 'Profile', error: 'Username already exists.' });
    }
    const existingemail = await this.findUserByEmail(email);
    if (existingemail && (email != originUser.email)) {
        return res.render('profile', { title: 'Profile', error: 'Email already registered.' });
    }

    userName = Validation.checkString(userName, "Validate username").toLowerCase();
    firstName = Validation.checkString(firstName, "Validate firstName").toLowerCase();
    lastName = Validation.checkString(lastName, "Validate lastName").toLowerCase();
    email = Validation.checkEmail(email).toLowerCase();
    bio = bio ? Validation.checkString(bio, "bio") : '';
    gender = gender ? Validation.checkGender(gender, "gender") : '';
    city = city ? Validation.checkString(city, "city") : '';
    state = state ? Validation.checkString(state, "state") : '';
    dob = dob ? Validation.checkDate(dob) : '';
    courses = courses ? Validation.checkStringArray(courses) : [];
    education = education ? Validation.checkEducation(education) : [];
    profilePicture = profilePicture ? Validation.checkImageUrl(profilePicture) : '';

    if (userName) originUser.userName = userName;
    if (firstName) originUser.firstName = firstName;
    if (lastName) originUser.lastName = lastName;
    if (email) originUser.email = email;

    if (courses) originUser.courses = courses;
    if (bio) originUser.bio = bio;
    if (gender) originUser.gender = gender;
    if (city) originUser.city = city;
    if (state) originUser.state = state;
    if (dob) {
        originUser.dob = dob
        originUser.age = dob != '' ? Validation.getAge(dob) : ''
    };
    if (courses) originUser.courses = courses;
    if (education) originUser.education = education;
    if (profilePicture) originUser.profilePicture = profilePicture;


    const userCollection = await users();
    let userId = originUserData._id.toString();

    const updatedUser = await userCollection.updateOne({ _id: new ObjectId(userId) }, { $set: originUser });
    if (!updatedUser.matchedCount && !updatedUser.modifiedCount) {
        throw 'could not update user successfully';
    }
    const user = await this.findUserById(userId);
    return user;
};

async function addBadge(userName, badgeIds) {
    if (!userName || !badgeIds) throw "All fields are required";
    userName = Validation.checkString(userName, "Validate username");
    badgeIds = Validation.checkStringArray(badgeIds);

    let findUser = await findUserByUsername(userName);
    if (!findUser) throw "No user found";


    var updatedBadgeIds = Array.from(new Set([...(findUser.badgeIds || []), ...badgeIds]));

    const userCollection = await users();
    let userId = findUser._id.toString();
    const updatedUser = await userCollection.updateOne({ _id: new ObjectId(userId) }, { $set: { badgeIds: updatedBadgeIds } });

    if (!updatedUser.matchedCount && !updatedUser.modifiedCount) {
        throw 'Could not update user successfully';
    }

    const user = await this.findUserById(userId);
    return user;
}

async function removeUser(userId) {
    if (!userId) throw 'Need to provide userId';
    userId = Validation.checkId(userId);
    const userCollection = await users();
    const user = await findUserById(userId);
    if (user === null) throw 'No user with that id';

    const deletionInfo = await userCollection.deleteOne({ _id: new ObjectId(userId) });

    if (deletionInfo.deletedCount === 0) {
        throw `Could not delete Band with id of ${userId}`;
    } else {
        return true;
    }
};

async function checkLogin(userName, password) {
    if (!userName || !password) throw "All fields are required"
    userName = Validation.checkUserName(userName);
    password = Validation.checkString(password, "password");
    //find normal user
    let resUser = null;
    let findUser = await findUserByUsername(userName);
    //find business
    // let findUser = await findUserByUsername(userName);
    let findBusiness = null;
    //find admin user
    let findAdmin = await admindata.findAdminByadminName(userName);
    if (findUser) {
        resUser = findUser;
    } else if (findAdmin) {
        resUser = findAdmin;
    } else if (findBusiness) {
        resUser = findBusiness;
    }

    if (!resUser) throw "Either userName or password is wrong";
    const match = await bcrypt.compare(password, resUser.hashedPassword);
    if (match) {
        return resUser;
    } else {
        throw "Either userName or password is wrong"
    }

};

export { createUser, findUserByEmail, findUserByUsername, findUserById, getAllUsers, updateUserProfile, removeUser, checkLogin, addBadge };