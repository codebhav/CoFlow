import { admin } from '../config/mongoCollections.js'
import Validation from '../helpers.js'
import { ObjectId } from 'mongodb';
import { findUserByUsername } from './user.js';

async function createAdmin(userName, hashedPassword) {
    if (!userName ||
        !hashedPassword
    )
        throw 'Admin username and password fields need to have valid values';
    userName = Validation.checkString(userName, "Validate username");
    hashedPassword = Validation.checkString(hashedPassword, "hashedPassword");
    const adminCollection = await admin();

    var newAdmin = {
        userName: userName,
        hashedPassword: hashedPassword,
        role: "admin"
    }
    const newInsertInformation = await adminCollection.insertOne(newAdmin);
    if (!newInsertInformation.insertedId) throw 'Insert failed!';
    // return await this.findUserById(newInsertInformation.insertedId.toString());
    return await this.findAdminByadminName(userName);
}


async function findAdminById(adminId) {
    if (!adminId) throw 'You must provide an userId to search for';
    adminId = Validation.checkId(adminId);
    const adminCollection = await admin();
    const findAdmin = await adminCollection.findOne({ _id: new ObjectId(adminId) });
    if (findAdmin === null) return null;
    findAdmin._id = findAdmin._id.toString();
    return findAdmin;
};
async function findAdminByadminName(adminUserName) {
    if (!adminUserName) throw 'You must provide an username to search for';
    adminUserName = Validation.checkString(adminUserName, "check username");
    const adminCollection = await admin();
    const findAdmin = await adminCollection.findOne({ userName: adminUserName });
    if (findAdmin === null) return null;
    findAdmin._id = findAdmin._id.toString();
    return findAdmin;
};

async function getAllAdmin() {
    const adminCollection = await admin();
    const adminList = await adminCollection.find({}).toArray();
    adminList.forEach((element) => {
        element._id = element._id.toString();
    });
    return adminList;
};

async function removeAdmin(adminId) {
    if (!adminId) throw 'Admin ID is required';
    adminId = Validation.checkId(adminId);
    
    const adminCollection = await admins();
    const deletionInfo = await adminCollection.deleteOne({ _id: new ObjectId(adminId) });
    
    if (deletionInfo.deletedCount === 0) throw 'Failed to delete admin';
    return { deleted: true, id: adminId };
}

async function checkAdminLogin(userName, password) {
    if (!userName || !password) throw 'Username and password are required';
    
    userName = Validation.checkString(userName, "Username");
    password = Validation.checkString(password, "Password");
    
    const admin = await findAdminByUsername(userName);
    if (!admin) throw 'Invalid credentials';
    
    const match = await bcrypt.compare(password, admin.hashedPassword);
    if (!match) throw 'Invalid credentials';
    
    return admin;
}



export { createAdmin, findAdminById, findAdminByadminName, getAllAdmin, removeAdmin }

