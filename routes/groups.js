import { Router } from 'express';
const router = Router();
import * as groupData from '../data/groups.js';
import middleware from '../middleware.js';
import Validation from '../helpers.js'



router.route('/').get(async (req, res) => {
    //code here for GET
    try {
        if(req.session && req.session.user){
            console.log(req.session.user.id);

            let groups = await groupData.getGroupsHelper(req.session.user.id);

            console.log(groups);
            
            
            return res.render('groups', { groups, title: 'Groups' });
        }
    } catch (e) {
      return res.status(500).render('error', { error: 'Internal Server Error' });
    }
});

router.route('/reqJoin').post(async(req, res) => {
    try {
        if(req.session && req.session.user){
            let requestGroup = await groupData.requestToJoin(req.session.user.id, req.body.formId);
        }
    } catch (e) {
      return res.status(500).render('error', { error: 'Internal Server Error' });
    }


});


router.route('/search').post(async(req, res) => {
    try {
        if(req.session && req.session.user){
            console.log(req.body);
            let groups = await groupData.searchGroups(req.body.search, req.session.user.id);
            return res.render('groups', { groups, title: 'Groups' });

            
        }
    } catch (e) {
      return res.status(500).render('error', { error: 'Internal Server Error' });
    }


});





router.route('/pendingUsers').post(async(req, res) => {
    try {
        if(req.session && req.session.user){
            console.log(req.body)
            let pendingUsers = await groupData.getPendingUsersForGroup(req.body.groupId, req.session.user.id);
            console.log(pendingUsers);
            res.json(pendingUsers);
            

        }

        
    } catch (e) {
        return res.status(500).render('error', { error: 'Internal Server Error' });
        
    }
});



router.route('/removeUser').post(async(req, res) => {
    try {
        if(req.session && req.session.user){
            console.log(req.body)
            let removedUser = await groupData.removeUser(req.session.user.id, req.body.userId, req.body.groupId);
            console.log(removedUser);
            res.redirect('/groups/myGroups')

        }

        
    } catch (e) {
        return res.status(500).render('error', { error: 'Internal Server Error' });
        
    }
});



router.route('/acceptUser').post(async(req, res) => {
    try {
        if(req.session && req.session.user){
            console.log(req.body);
            let acceptedUser = await groupData.approveUser(req.session.user.id, req.body.userId, req.body.groupId);
            console.log(acceptedUser);
            res.redirect('/groups/myGroups')



        }

        
    } catch (e) {
        return res.status(500).render('error', { error: 'Internal Server Error' });
        
    }
});


router.route('/rejectUser').post(async(req, res) => {
    try {
        if(req.session && req.session.user){
            console.log(req.body);
            let rejectedUser = await groupData.rejectUser(req.session.user.id, req.body.userId, req.body.groupId);
            console.log(rejectedUser);
            res.redirect('/groups/myGroups')


            
        }

        
    } catch (e) {
        return res.status(500).render('error', { error: 'Internal Server Error' });
        
    }
});



router.route('/approvedUsers').post(async(req, res) => {
    try {
        if(req.session && req.session.user){
            console.log(req.body);
            let approvedUsers = await groupData.getJoinedUsers(req.body.groupId, req.session.user.id);
            console.log(approvedUsers);
            res.json(approvedUsers);

            
        }
    } catch (e) {
      return res.status(500).render('error', { error: 'Internal Server Error' });
    }


});


router.route('/leave').post(async(req, res) => {
    try {
        if(req.session && req.session.user){
            console.log('Leaving Group: ', req.body);
            let approvedUsers = await groupData.leaveGroup(req.session.user.id, req.body.groupId);
            console.log(approvedUsers);
            res.redirect('/groups/myGroups');

            
        }
    } catch (e) {
      return res.status(500).render('error', { error: 'Internal Server Error' });
    }


});


router.route('/cancelReq').post(async(req, res) => {
    try {
        if(req.session && req.session.user){
            console.log('Leaving Group: ', req.body);
            let cancelledRequest = await groupData.cancelRequst(req.session.user.id, req.body.groupId);
            console.log(cancelledRequest);
            res.redirect('/groups/myGroups');

            
        }
    } catch (e) {
      return res.status(500).render('error', { error: 'Internal Server Error' });
    }


});



router.route('/deleteGroup').post(async(req, res) => {
    try {
        if(req.session && req.session.user){
            console.log(req.body);
            let deletedGroupInfo = await groupData.deleteGroup(req.body.groupId, req.session.user.id);
            console.log(deletedGroupInfo);
            res.redirect('/groups/myGroups')
        }
    } catch (e) {
      return res.status(500).render('error', { error: 'Internal Server Error' });
    }


});




router.route('/myGroups').get(async(req, res) => {
    try {
        if(req.session && req.session.user){


        // let pendingGroups = await groupData.getPendingGroupsById();

        // let myGroups = await groupData.getGroupById()

        // let createdGroup = await groupData.getCreatedGroups();
            let userId = req.session.user.id;
            let ownedGroups = await groupData.getGroupDataForMember(userId);
            let joinedGroups = await groupData.getJoinedGroupDataForMember(userId);
            let pendingGroups = await groupData.getPendingGroupDataForMember(userId);

            

            return res.render('mygroups', { ownedGroups, joinedGroups, pendingGroups, title: 'Groups' })
        }
        
    } catch (e) {
        return res.status(500).render('error', { error: 'Internal Server Error' });                
    }
})
.post(async(req, res) => {
    try {
        if(req.session && req.session.user){
            let userId = req.session.user.id;
            let newGroup = await groupData.createGroupHelper(req.body.groupName, req.body.description, Number(req.body.capacity), req.body.location, req.body.course, req.body.startTime, req.body.endTime, req.body.meetingDate, req.body.groupType, userId, ['This', 'is', 'temporary']);
            res.redirect('/groups/myGroups')
        }
        
    } catch (e) {
        return res.status(500).render('error', { error: 'Internal Server Error' });
                
    }

});


export default router;