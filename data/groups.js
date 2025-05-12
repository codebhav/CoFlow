import { groups } from '../config/mongoCollections.js';
import { users } from '../config/mongoCollections.js';
import helpers from "../helpers.js";
import { ObjectId } from 'mongodb';
import { findUserById } from './user.js';




export const addGroupToUser = async(groupId, userId) => {
    let usersCollection = await users();
    if(!usersCollection) throw 'Could not connect to database';

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { createdGroups: groupId } }
    );


    if(!result){
        throw 'Could not update db'
    }

    return result;
    


};



export const addScheduleToUser = async(userId, groupId) => {
    let usersCollection = await users();
    if(!usersCollection) throw 'Could not connect to database';

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { createdGroups: groupId } }
    );



};



export const getPendingUsersForGroup = async (groupId, userId) => {
    if(!userId) throw 'Must provide userId';
    if(!groupId) throw 'Must provide groupId';
    userId = helpers.checkId(userId, 'userId');
    groupId = helpers.checkId(groupId, 'groupId');


    let userGroups = await getGroupById(groupId);

    if(!helpers.isAdmin(userGroups, userId)) throw 'Permission denied, must be group admin'



    if(userGroups.length == 0){
        return [];
    }

    let pendingMembersVar = userGroups.pendingMembers;


    async function processUsers() {
        let newArr = [];
        for (let i = 0; i < pendingMembersVar.length; i++) {
            let newNewArr = []
            const userId = pendingMembersVar[i];
            newNewArr.push(userId)
            const user = await findUserById(userId);
            newNewArr.push(user.userName);
            newArr.push(newNewArr);
        }
        return newArr;
    }
    let newArr = await processUsers();

    return newArr;




};

export const getJoinedUsers = async (groupId, userId) => {
    if(!userId) throw 'Must provide userId';
    if(!groupId) throw 'Must provide groupId';

    userId = helpers.checkId(userId, 'userId');
    groupId = helpers.checkId(groupId, 'groupId');


    let userGroups = await getGroupById(groupId);

    if(!helpers.isAdmin(userGroups, userId)) throw 'Permission denied, must be group admin'



    if(userGroups.length == 0){
        return [];
    }

    let pendingMembersVar = userGroups.members;


    async function processUsers() {
        let newArr = [];
        for (let i = 0; i < pendingMembersVar.length; i++) {
            let newNewArr = []
            const userId = pendingMembersVar[i];
            newNewArr.push(userId)
            const user = await findUserById(userId);
            newNewArr.push(user.userName);
            newArr.push(newNewArr);
        }
        return newArr;
    }
    let newArr = await processUsers();

    return newArr;




};



export const createGroupHelper = async (
    groupName,
    description,
    capacity,
    location,
    course,
    startTime,
    endTime,
    meetingDate,
    groupType,
    creatorId,
    tags
) => {
    if (!groupName || !description || !capacity || !location || !course || !startTime || !endTime || !meetingDate || !groupType || !creatorId || !tags) {
        throw 'All fields must have inputs'
    };

    groupName = helpers.checkString(groupName, 'groupName');
    description = helpers.checkString(description, 'description');
    if((!Number.isInteger(capacity)) || !((capacity > 1) && (capacity < 16))) throw 'Capacity must be a postiive integer less than 16 and greater than 1';
    location = helpers.checkLocation(location);
    course = helpers.checkCourse(course);
    startTime = helpers.checkTime(startTime);
    endTime = helpers.checkTime(endTime);
    helpers.checkTimes(startTime, endTime);
    meetingDate = helpers.checkDate(meetingDate);
    groupType = helpers.checkType(groupType);
    creatorId = helpers.checkId(creatorId, 'creatorId');
    tags = helpers.checkStringArray(tags, 'tags');


    let currentUser = await findUserById(creatorId);
    if(!currentUser){
        throw 'Could not find given user'
    }

    let userCreatedGroups = currentUser.createdGroups;


    // if(userCreatedGroups.length >= 2) throw 'You may only create two groups at a time'




    let createdGroup = await createGroup(
        groupName,
        description,
        capacity,
        location,
        course,
        startTime,
        endTime,
        meetingDate,
        groupType,
        creatorId,
        tags
    )


    let addedGroup = addGroupToUser(createdGroup.insertedId.toString(), creatorId.toString());

    return addedGroup;


}
export const createGroup = async (
    groupName,
    description,
    capacity,
    location,
    course,
    startTime,
    endTime,
    meetingDate,
    groupType,
    creatorId,
    tags
) => {
    //Creates a new group






    let groupsCollection = await groups();
    if(!groupsCollection) throw 'Could not connect to database';


    const currentDate = helpers.getDate();
    if(!currentDate) throw 'Could not fetch current date';


    let group = {
        groupName,
        course,
        groupType,
        meetingDate,
        startTime,
        endTime,
        location,
        isFull: false,
        description,
        capacity,
        members: [creatorId],
        pendingMembers: [],
        rejectedMembers: [],
        tags,
        createdAt: currentDate,
        updatedAt: currentDate
    }
    if(!group) throw 'Could not create group';

    let newCollection = await groupsCollection.insertOne(group);
    if(!newCollection) throw 'Could not create group';




    return newCollection;

};


// export const getPendingUsers = async(userId, groupId) => {
//     console.log(userId, groupId);
//     if(!userId) throw 'Must provide userId';
//     if(!groupId) throw 'Must provide groupId';

//     userId = helpers.checkId(userId);
//     groupId = helpers.checkId(groupId);

//     if(!isAdmin(userId)) throw 'Permission denied, must be group admin'

//     let userGroups = await getGroupById(groupId);


//     if(userGroups.length == 0){
//         return [];
//     }
    
//     let newArr = [];

//     for (let i = 0; i < userGroups.length; i++) {
//         newArr[i] = await getGroupById(userGroups[i]);
//     }



// };





export const deleteGroup = async (groupId, userId) => {
    if (!userId) {
      throw 'Must provide userId';
    }
    if (!groupId) {
      throw 'Must provide groupId';
    }
  
    userId = helpers.checkId(userId, 'userId');
    groupId = helpers.checkId(groupId, 'groupId');
  
    const userGroups = await getGroupById(groupId);
    if (!userGroups) {
      throw 'Could not find group';
    }
  
    const usersCollection = await users();
    if (!usersCollection) {
      throw 'Could not connect to database';
    }
  
    if (!helpers.isAdmin(userGroups, userId)) {
      throw 'Permission denied, must be group admin';
    }
  
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { createdGroups: groupId } }
    );
  
    if (result.matchedCount === 0) {
      throw 'Could not update db';
    }
  
    const groupsCollection = await groups();
    const deletionInfo = await groupsCollection.findOneAndDelete({
      _id: new ObjectId(groupId)
    });
  
    if (!deletionInfo) {
      throw `Could not delete group with id of ${groupId}`;
    }
  
    return { ...deletionInfo.value, deleted: true };
};

  
export const editGroup = async (
    groupId,
    groupName,
    description,
    capacity,
    location,
    course,
    startTime,
    endTime,
    meetingDate,
    groupType,
    creatorId,
    tags
) => {
    //Allows the user to edit most properties of a group
    if (!groupName || !description || !capacity || !location || !course || !startTime || !endTime || !meetingDate || !groupType || !creatorId || !tags) {
        throw 'All fields must have inputs'
    };

    groupName = helpers.checkString(groupName, 'groupName');
    description = helpers.checkString(description, 'description');
    if((!Number.isInteger(capacity)) || !((capacity > 1) && (capacity < 16))) throw 'Capacity must be a postiive integer less than 16 and greater than 1';
    location = helpers.checkLocation(location);
    course = helpers.checkCourse(course);
    startTime = helpers.checkTime(startTime);
    endTime = helpers.checkTime(startTime);
    checkTimes(startTime, endTime);
    meetingDate = helpers.checkDate(meetingDate);
    groupType = helpers.checkType(groupType);
    creatorId = helpers.checkId(creatorId, 'creatorId');
    tags = helpers.checkStringArray(tags, 'tags');



    if(!helpers.isAdmin(groupId, userId)) throw 'User does not have permissions to edit group';

    let groupsCollection = await groups();


    const currentDate = helpers.getDate();

    const currentGroupInfo = await groupsCollection.findOne({
        _id: new ObjectId(groupId)
    });

    let group = {
        groupName,
        course,
        groupType,
        meetingDate,
        startTime,
        endTime,
        location,
        isFull: false,
        description,
        capacity,
        members: [creatorId],
        pendingMembers: [],
        tags,
        createdAt: currentDate,
        updatedAt: currentDate
    }
};



export const getAllGroups = async () => {
    //Returns all groups
    let groupsCollection = await groups();
    let groupsCollection2 = await groupsCollection.find({}).toArray();
  
  
    if(groupsCollection2.length == 0) return [];
  
  
    return groupsCollection2;
  
};


export const getGroupById = async(groupId) => {
    //Returns group matching given Id
    if(!groupId) throw 'Must provide groupId';

    groupId = helpers.checkId(groupId);



    const groupsCollection = await groups();
  
    const group = await groupsCollection.findOne({_id: new ObjectId(groupId)});
  
    if(!group){
        return;
    }
  
    group._id = group._id.toString();
  
    
    return group;


};



export const getGroupDataForMember = async(userId) =>{
    if(!userId) throw 'Must provide userId';


    userId = helpers.checkId(userId);

    let userGroups = await getGroupsForMember(userId);


    if(userGroups.length == 0){
        return [];
    }
    
    let newArr = [];
    
    for (let i = 0; i < userGroups.length; i++) {
        try {
            let tempvar = await getGroupById(userGroups[i]);
            console.log('tempvar:', tempvar)
            if(tempvar != undefined){
                newArr[i] = tempvar;

            }
            
            
        } catch (error) {
            return [];
            
        }
        
    }

    return newArr;



};



export const getJoinedGroupDataForMember = async(userId) =>{
    if(!userId) throw 'Must provide userId';


    userId = helpers.checkId(userId);

    let userGroups = await getJoinedGroupsForMember(userId);

    console.log(userGroups);


    if(userGroups.length == 0){
        return [];
    }
    
    let newArr = [];

    for (let i = 0; i < userGroups.length; i++) {
        try {
            let tempvar = await getGroupById(userGroups[i]);
            console.log('tempvar:', tempvar)
            if(tempvar != undefined){
                newArr[i] = tempvar;

            }
            
            
        } catch (error) {
            return [];
            
        }
        
    }

    return newArr;



};


export const getJoinedGroupsForMember = async(userId) => {
    if(!userId) throw 'Must provide userId';

    userId = helpers.checkId(userId);

    let currentUser = await findUserById(userId);


    return currentUser.joinedGroups;




};


export const getPendingGroupDataForMember = async(userId) =>{
    if(!userId) throw 'Must provide userId';


    userId = helpers.checkId(userId);

    let userGroups = await getPendingGroupsForMember(userId);

    console.log(userGroups);

    if(userGroups.length == 0){
        return [];
    }
    
    let newArr = [];

    for (let i = 0; i < userGroups.length; i++) {
        try {
            let tempvar = await getGroupById(userGroups[i]);
            console.log('tempvar:', tempvar)
            if(tempvar != undefined){
                newArr[i] = tempvar;

            }
            
            
        } catch (error) {
            return [];
            
        }
        
    }

    return newArr;



};


export const getPendingGroupsForMember = async(userId) => {
    if(!userId) throw 'Must provide userId';

    userId = helpers.checkId(userId);

    let currentUser = await findUserById(userId);


    return currentUser.pendingGroups;




};





export const getGroupsForMember = async(userId) => {
    //Returns all groups a specific user is a member of
    if(!userId) throw 'Must provide userId';

    userId = helpers.checkId(userId);

    let currentUser = await findUserById(userId);


    return currentUser.createdGroups;


    // const groupsCollection = await groups();

    // let groups = groupsCollection.find({ members: { $in: [userId] } })

    // if(!groups) {
    //     throw 'Could not find any groups that the given user is part of';
    // }
    

    // return groups;



};


export const searchGroups = async (query, userId) => {
    if (typeof query !== 'string') {
      throw 'query must be a string';
    }

    if(!userId) throw 'Must enter userId'

    userId = helpers.checkId(userId, 'userId');
  
    const allGroups = await getGroupsHelper(userId);
  
    const matching = allGroups.filter(group => {
      return group.groupName.startsWith(query);
    });
  
    return matching;
  };


export const getAllNonFullGroups = async () => {
    const groupsCollection = await groups();
    if (!groupsCollection) {
      throw new Error('Could not connect to DB');
    }
  
    const openGroups = await groupsCollection.find({ isFull: false }).toArray();
    if (openGroups.length === 0) {
      return [];
    }
  
    const now = new Date();
  
    const upcomingGroups = openGroups.filter(group => {
      const { meetingDate, endTime } = group;
      if (!meetingDate || !endTime) {
        return true;
      }
  
      const [year, month, day] = meetingDate.split('-').map(Number);
      const [hour, minute] = endTime.split(':').map(Number);
  
      const meetingEnd = new Date(year, month - 1, day, hour, minute);
  
      return meetingEnd > now;
    });
  
    return upcomingGroups;
  };
  

export const requestToJoin = async(userId, groupId) =>{
    console.log(userId, groupId);
    if(!userId) throw 'Must provide userId';
    if(!groupId) throw 'Must provide groupId';

    userId = helpers.checkId(userId);
    groupId = helpers.checkId(groupId);

    const groupsCollection = await groups();
    if(!groupsCollection) throw 'Could not connect to database';

    let approvedUsers = await groupsCollection.findOne({_id: new ObjectId(groupId)});
    if(!approvedUsers) throw 'Could not find group';

    approvedUsers = approvedUsers.members;

    console.log('These are the member:', approvedUsers);

    if(approvedUsers.includes(userId.toString())) throw 'User already joined';


    const result = await groupsCollection.findOneAndUpdate(
        { _id: new ObjectId(groupId) },
        { $addToSet: { pendingMembers: userId } },
        { new: true }
    );
  
    if (!result) {
        return;
    }


    let usersCollection = await users();
    if(!usersCollection) throw 'Could not connect to database';

    const updateUser = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { pendingGroups: groupId } },
      { new: true }

    );


    if(!updateUser){
        throw 'Could not update db'
    }






    console.log(result);
    
    return result;


};

export const cancelRequst = async (userId, groupId) => {
    if (!userId) throw new Error('Must provide userId');
    if (!groupId) throw new Error('Must provide groupId');
  
  
    userId = helpers.checkId(userId);
    groupId = helpers.checkId(groupId);
    
    const groupsCollection = await groups();
  
    try {
      const updatedGroup = await groupsCollection.updateOne(
        { _id: new ObjectId(groupId) },
        {
          $pull: { pendingMembers: userId },
        }
      );
  
      if (updatedGroup.modifiedCount === 0) throw new Error('Could not update membership info');
  
      let usersCollection = await users();
      if (!usersCollection) throw new Error('Could not connect to database');
  
        const updateUser = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $pull: { pendingGroups: groupId } },
            { returnDocument: 'after' }
        );
  
        if (!updateUser) throw new Error('Could not update user');
  
        return updatedGroup;
    } catch (error) {
        throw new Error(`Error rejecting user: ${error.message}`);
    }
  };
  




  export const rejectUser = async (userId, rejectedUser, groupId) => {
    if (!userId) throw new Error('Must provide userId');
    if (!rejectedUser) throw new Error('Must provide rejectedUser');
    if (!groupId) throw new Error('Must provide groupId');
  
    console.log('Function called successfully: ', userId, rejectedUser, groupId);
  
    userId = helpers.checkId(userId);
    rejectedUser = helpers.checkId(rejectedUser);
    groupId = helpers.checkId(groupId);
  
    let userGroups = await getGroupById(groupId);
  
    if (!userGroups || userGroups.length === 0) throw new Error('Could not find group');
  
    if (!helpers.isAdmin(userGroups, userId)) throw new Error('Permission denied, must be group admin');
  
    const groupsCollection = await groups();
  
    try {
      const updatedGroup = await groupsCollection.updateOne(
        { _id: new ObjectId(groupId) },
        {
          $pull: { pendingMembers: rejectedUser },
        }
      );
  
      if (updatedGroup.modifiedCount === 0) throw new Error('Could not update membership info');
  
      let usersCollection = await users();
      if (!usersCollection) throw new Error('Could not connect to database');
  
      const updateUser = await usersCollection.updateOne(
        { _id: new ObjectId(rejectedUser) },
        { $pull: { pendingGroups: groupId } },
        { returnDocument: 'after' }
      );
  
      if (!updateUser) throw new Error('Could not update user');
  
      return updatedGroup;
    } catch (error) {
      throw new Error(`Error rejecting user: ${error.message}`);
    }
  };




  export const assignUserRoles = async (groups, userId) => {
    return groups.map(group => {
      let userRole = 'noval';
  
      const memberIndex = group.members.indexOf(userId);
      if (memberIndex === 0) {
        userRole = 'admin';
      } else if (memberIndex > 0) {
        userRole = 'member';
      }
      else if (group.pendingMembers.includes(userId)) {
        userRole = 'pending';
      }
  
      return {
        ...group,
        userRole
      };
    });
  };



  export const getGroupsHelper = async (userId) => {
    if(!userId) throw 'Must input userId'

    let nonFullGroups = await getAllNonFullGroups();

    console.log('nonfullgroups:', nonFullGroups)

    let groupsWithRoles = await assignUserRoles(nonFullGroups, userId)

    console.log(groupsWithRoles);

    return groupsWithRoles;
  };







  export const removeUser = async (userId, rejectedUser, groupId) => {
    if (!userId) throw new Error('Must provide userId');
    if (!rejectedUser) throw new Error('Must provide rejectedUser');
    if (!groupId) throw new Error('Must provide groupId');

    console.log('Function called successfully: ', userId, rejectedUser, groupId);

    userId = helpers.checkId(userId);
    rejectedUser = helpers.checkId(rejectedUser);
    groupId = helpers.checkId(groupId);

    let userGroups = await getGroupById(groupId);

    if (!userGroups || userGroups.length === 0) throw new Error('Could not find group');

    if (!helpers.isAdmin(userGroups, userId)) throw new Error('Permission denied, must be group admin');

    const groupsCollection = await groups();

    // Check if rejectedUser is a member of the group
    if (!userGroups.members.includes(rejectedUser)) {
        throw new Error('User is not a member of the group');
    }

    try {
        const updatedGroup = await groupsCollection.updateOne(
            { _id: new ObjectId(groupId) },
            {
                $pull: { members: rejectedUser },
            }
        );

        let usersCollection = await users();
        if (!usersCollection) throw 'Could not connect to database';

        const updateUser = await usersCollection.updateOne(
            { _id: new ObjectId(rejectedUser) },
            {
                $pull: { joinedGroups: groupId },
            },
        );

        if (!updateUser) throw 'Could not update user data';

        return updatedGroup;
    } catch (error) {
        throw new Error(`Error removing user from group: ${error.message}`);
    }
};




export const leaveGroup = async (userId, groupId) => {
    if (!userId) throw new Error('Must provide userId');
    if (!groupId) throw new Error('Must provide groupId');

    userId = helpers.checkId(userId);
    groupId = helpers.checkId(groupId);

    let userGroups = await getGroupById(groupId);

    if (!userGroups || userGroups.length === 0) throw new Error('Could not find group');

    const groupsCollection = await groups();

    // Check if userId is a member of the group
    if (!userGroups.members.includes(userId)) {
        throw new Error('User is not a member of the group');
    }

    try {
        const updatedGroup = await groupsCollection.updateOne(
            { _id: new ObjectId(groupId) },
            {
                $pull: { members: userId },
            }
        );

        let usersCollection = await users();
        if (!usersCollection) throw 'Could not connect to database';

        const updateUser = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $pull: { joinedGroups: groupId },
            },
        );

        if (!updateUser) throw 'Could not update user data';

        return updatedGroup;
    } catch (error) {
        throw new Error(`Error removing user from group: ${error.message}`);
    }
};





export const approveUser = async (userId, approvedUser, groupId) => {
    if (!userId) throw new Error('Must provide userId');
    if (!approvedUser) throw new Error('Must provide approvedUser');
    if (!groupId) throw new Error('Must provide groupId');

    userId = helpers.checkId(userId);
    approvedUser = helpers.checkId(approvedUser);
    groupId = helpers.checkId(groupId);

    try {
        let userGroups = await getGroupById(groupId);
        if (!userGroups || userGroups.length === 0) throw 'Could not find group';
        if (!helpers.isAdmin(userGroups, userId)) throw 'Permission denied, must be group admin';

        if(userGroups.members.length >= Number(userGroups.capacity)) throw 'Group is Full';


        const groupsCollection = await groups();
        const updatedGroup = await groupsCollection.updateOne(
            { _id: new ObjectId(groupId) },
            {
                $pull: { pendingMembers: approvedUser },
                $addToSet: { members: approvedUser }
            }
        );

        if (updatedGroup.modifiedCount === 0) throw 'Could not update membership data';

        let usersCollection = await users();
        if (!usersCollection) throw 'Could not connect to database';

        const updateUser = await usersCollection.updateOne(
            { _id: new ObjectId(approvedUser) },
            {
                $pull: { pendingGroups: groupId },
                $addToSet: { joinedGroups: groupId }
            },
            { new: true }
        );

        if (!updateUser) throw 'Could not update user data';

        return updatedGroup;
    } catch (error) {
        throw `Error approving user: ${error.message}`;
    }
};





export const getGroupsByProperty = async() => {

};