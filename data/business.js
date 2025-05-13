import { busers } from '../config/mongoCollections.js';
import { groups } from '../config/mongoCollections.js';
import Validation from '../helpers.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
// import { formatTime } from '../helpers.js';//获取标准时间，helpers记得更新

async function createBuser(userName, company, email, phone, description, hashedPassword, address, city, state, courses, terms, privacy) {
    if (!userName || !company || !email || !phone || !description || !hashedPassword || !address || !city || !state || !courses || terms !== 'on' || privacy !== 'on') {
        throw 'All required fields must have valid values';
    }

    userName = Validation.checkString(userName, "Username");
    company = Validation.checkString(company, "Company");
    email = Validation.checkEmail(email).toLowerCase();
    phone = Validation.checkPhone(phone, "Phone");
    description = Validation.checkString(description, "Description");
    hashedPassword = Validation.checkString(hashedPassword, "Hashed password");
    address = Validation.checkString(address, "Address");
    city = Validation.checkString(city, "City");
    state = Validation.checkString(state, "State");
    courses = Validation.checkStringArray(courses, "Courses");

    const buserCollection = await busers();
    const existingUsername = await findBuserByUsername(userName);
    if (existingUsername) throw 'Username already exists';
    const existingEmail = await findBuserByEmail(email);
    if (existingEmail) throw 'Email already exists';

    const newBuser = {
        userName,
        company,
        email,
        phone,
        description,
        hashedPassword,
        address,
        city,
        state,
        courses,
        terms: true,
        privacy: true,
        role: "business",
        createdAt: new Date().toISOString(),
        schedule: [],
        notificationSettings: {},
        createdgroups: [],
        joinedgroups: []
    };

    const insertInfo = await buserCollection.insertOne(newBuser);
    if (!insertInfo.insertedId) throw 'Failed to create business user';
    return await findBuserById(insertInfo.insertedId.toString());
}

async function findBuserById(buserId) {
    if (!buserId) throw 'Business user ID is required';
    buserId = Validation.checkId(buserId);
    const buserCollection = await busers();
    const buser = await buserCollection.findOne({ _id: new ObjectId(buserId) });
    if (!buser) return null;
    buser._id = buser._id.toString();
    return buser;
}

async function findBuserByUsername(username) {
    if (!username) throw 'Username is required';
    username = Validation.checkString(username, "Username");
    const buserCollection = await busers();
    const buser = await buserCollection.findOne({ userName: username });
    if (!buser) return null;
    buser._id = buser._id.toString();
    return buser;
}

async function findBuserByEmail(email) {
    if (!email) throw 'Email is required';
    email = Validation.checkEmail(email);
    const buserCollection = await busers();
    const buser = await buserCollection.findOne({ email: email });
    if (!buser) return null;
    buser._id = buser._id.toString();
    return buser;
}

async function getAllBusers() {
    const buserCollection = await busers();
    return await buserCollection.find({}).toArray();
}

async function updateBuser(buserId, updateData) {
    if (!buserId) throw 'Business user ID is required';
    buserId = Validation.checkId(buserId);
    
    const buserCollection = await busers();
    const existingBuser = await findBuserById(buserId);
    if (!existingBuser) throw 'Business user not found';

    const updates = {};
    if (updateData.userName) {
        const existingUsername = await findBuserByUsername(updateData.userName);
        if (existingUsername && existingUsername._id !== buserId) throw 'Username already exists';
        updates.userName = Validation.checkString(updateData.userName, "Username");
    }
    if (updateData.company) updates.company = Validation.checkString(updateData.company, "Company");
    if (updateData.email) {
        const existingEmail = await findBuserByEmail(updateData.email);
        if (existingEmail && existingEmail._id !== buserId) throw 'Email already exists';
        updates.email = Validation.checkEmail(updateData.email).toLowerCase();
    }
    if (updateData.phone) updates.phone = Validation.checkPhone(updateData.phone, "Phone");
    if (updateData.description) updates.description = Validation.checkString(updateData.description, "Description");
    if (updateData.hashedPassword) updates.hashedPassword = Validation.checkString(updateData.hashedPassword, "Hashed password");
    if (updateData.address) updates.address = Validation.checkString(updateData.address, "Address");
    if (updateData.city) updates.city = Validation.checkString(updateData.city, "City");
    if (updateData.state) updates.state = Validation.checkString(updateData.state, "State");
    if (updateData.courses) updates.courses = Validation.checkStringArray(updateData.courses, "Courses");

    const result = await buserCollection.updateOne(
        { _id: new ObjectId(buserId) },
        { $set: updates }
    );

    if (result.modifiedCount === 0) throw 'No changes made';
    return await findBuserById(buserId);
}

async function removeBuser(buserId) {
    if (!buserId) throw 'Business user ID is required';
    buserId = Validation.checkId(buserId);
    
    const buserCollection = await busers();
    const deletionInfo = await buserCollection.deleteOne({ _id: new ObjectId(buserId) });
    
    if (deletionInfo.deletedCount === 0) throw 'Failed to delete business user';
    return { deleted: true, id: buserId };
}

async function checkBuserLogin(userName, password) {
    if (!userName || !password) throw 'Username and password are required';
    
    userName = Validation.checkString(userName, "Username");
    password = Validation.checkString(password, "Password");
    
    const buser = await findBuserByUsername(userName);
    if (!buser) throw 'Invalid credentials';
    
    const match = await bcrypt.compare(password, buser.hashedPassword);
    if (!match) throw 'Invalid credentials';
    
    return buser;
}

 /**
 * 获取用户的完整日程（包含参与和主办的活动）
 * @param {string} buserId - 商家用户ID
 * @returns {Array} 合并后的日程列表
 */
async function getFullSchedule(buserId) {
    // 数据验证
    buserId = Validation.checkId(buserId);

    // 并行查询
    const [buser, hostedEvents] = await Promise.all([
        // 查询用户参与的群组（从schedule字段）
        busers().findOne(
            { _id: new ObjectId(buserId) },
            { projection: { schedule: 1 } }
        ),
        // 查询用户主办的群组
        groups().find(
            { host: new ObjectId(buserId) },
            { projection: { name: 1, start_time: 1, end_time: 1, location: 1 } }
        ).toArray()
    ]);

    // 数据合并与格式化
    return [
        // 参与的群组
        ...(buser.schedule?.map(item => ({
            type: 'participant',
            group_id: item.group_id.toString(),
            start_time: item.start_time,
            end_time: item.end_time,
            // 其他字段...
        })) || []),
        
        // 主办的群组
        ...hostedEvents.map(event => ({
            type: 'host',
            group_id: event._id.toString(),
            start_time: event.start_time,
            end_time: event.end_time,
            location: event.location
        }))
    ].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
}

/**
 * 添加日程项（含时间冲突检查）
 * @param {string} buserId 
 * @param {string} groupId 
 * @param {string} startTime 
 * @param {string} endTime 
 */
async function addScheduleItem(buserId, groupId, startTime, endTime) {
    // 数据验证
    buserId = Validation.checkId(buserId);
    groupId = Validation.checkId(groupId);
    startTime = new Date(startTime);
    endTime = new Date(endTime);

    if (startTime >= endTime) {
        throw 'End time must be after start time';
    }

    // 检查时间冲突
    const conflict = await busers().findOne({
        _id: new ObjectId(buserId),
        schedule: {
            $elemMatch: {
                $or: [
                    { start_time: { $lt: endTime }, end_time: { $gt: startTime } }
                ]
            }
        }
    });
    if (conflict) throw 'Time conflict with existing schedule';

    // 添加日程项
    const result = await busers().updateOne(
        { _id: new ObjectId(buserId) },
        { $push: { 
            schedule: { 
                group_id: new ObjectId(groupId),
                start_time: startTime,
                end_time: endTime
            }
        }}
    );

    if (result.modifiedCount === 0) throw 'Failed to add schedule item';
}

/**
 * 从用户日程中移除指定群组
 * @param {string} buserId 
 * @param {string} groupId 
 */
async function removeScheduleItem(buserId, groupId) {
    // 数据验证
    buserId = Validation.checkId(buserId);
    groupId = Validation.checkId(groupId);

    // 移除操作
    const result = await busers().updateOne(
        { _id: new ObjectId(buserId) },
        { $pull: { schedule: { group_id: new ObjectId(groupId) } } }
    );

    if (result.modifiedCount === 0) throw 'Schedule item not found';
}

/**
 * 获取商家用户主办的所有活动
 * @param {string} buserId 
 * @returns {Array} 主办的活动列表
 */
async function getHostedEvents(buserId) {
    // 数据验证
    buserId = Validation.checkId(buserId);

    // 查询主办的活动
    const events = await groups()
        .find({ host: new ObjectId(buserId) })
        .sort({ start_time: 1 })
        .toArray();

    // 格式化输出
    return events.map(event => ({
        group_id: event._id.toString(),
        name: event.name,
        start_time: event.start_time,
        end_time: event.end_time,
        location: event.location,
        // 其他业务字段...
    }));
}

export {
    createBuser,
    findBuserById,
    findBuserByUsername,
    findBuserByEmail,
    getAllBusers,
    updateBuser,
    removeBuser,
    checkBuserLogin,
    getFullSchedule,
    addScheduleItem,
    removeScheduleItem,
    getHostedEvents
};