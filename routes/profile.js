import { Router } from 'express';
const router = Router();
import * as profiledata from '../data/user.js';
import middleware from '../middleware.js';
import Validation from '../helpers.js';


router.route('/')
    .get(middleware.userRouteMiddleware, async(req, res) => {
        try {
            if (req.session && req.session.user) {
                const user = await profiledata.findUserById(req.session.user.id);
                res.render('profile', { title: 'Profile', user: user });
            }

        } catch (error) {
            console.error('Error fetching profile:', error);
            res.redirect('/auth/login');
        }
    })
    .post(async(req, res) => {
        const formData = req.body;
        console.log("Route profile form Data", formData);
        let { uploadPic, profilePicture, userName, firstName, lastName, email, bio, gender, state, city, dob, courses, education } = req.body;
        const lastuserName = req.session.user.userName;

        try {
            const originUsername = await profiledata.findUserByUsername(lastuserName);
            if (!originUsername) {
                return res.render('profile', { title: 'Profile', error: 'originalUsername not exists.' });
            }

            const existingUsername = await profiledata.findUserByUsername(userName);
            if (existingUsername && (userName != lastuserName)) {
                return res.render('profile', { title: 'Profile', error: 'Username already exists.' });
            }
            const existingemail = await profiledata.findUserByEmail(email);
            if (existingemail && (email != originUsername.email)) {
                return res.render('profile', { title: 'Profile', error: 'Email already registered.' });
            }

            if (!userName ||
                !firstName ||
                !lastName ||
                !email ||
                !lastuserName
            )
                throw 'basic info fields need to have valid values';
            userName = Validation.checkString(userName, "Validate username").toLowerCase();
            firstName = Validation.checkString(firstName, "Validate firstName").toLowerCase();
            lastName = Validation.checkString(lastName, "Validate lastName").toLowerCase();
            email = Validation.checkEmail(email).toLowerCase();
            profilePicture = Validation.checkImageUrl(profilePicture);

            courses = courses != '' ? courses.split(',').map(element => element.trim()) : null;
            bio = bio ? Validation.checkString(bio, "bio") : '';
            gender = gender ? Validation.checkGender(gender, "gender") : '';
            city = city ? Validation.checkString(city, "city") : '';
            state = state ? Validation.checkString(state, "state") : '';
            dob = dob ? Validation.checkDate(dob) : '';
            courses = courses ? Validation.checkStringArray(courses) : [];
            education = education ? Validation.checkEducation(education) : [];

            let updateUser = await profiledata.updateUserProfile(lastuserName, userName, firstName, lastName, email, bio, gender, state, city, dob, courses, education, profilePicture);
            if (updateUser) {
                req.session.user = {
                    id: updateUser._id,
                    userName: updateUser.userName,
                    firstName: updateUser.firstName,
                    lastName: updateUser.lastName,
                    role: "user"
                };
                res.redirect('/profile');
            } else {
                throw "Error: Fail to update user using updateUserProfile"
            }

        } catch (error) {
            console.error('Error in Profile', error);
            res.render('profile', { title: 'Profile', error: error });
        }
    });

router.route('/business').get(async(req, res) => {
    try {
        const user = await profiledata.findUserById(req.session.user.id);
        res.render('profile', { title: 'Profile', user: user });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.redirect('/auth/login');
    }
});

export default router;