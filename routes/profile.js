import { Router } from 'express';
const router = Router();
import * as profiledata from '../data/user.js';
import middleware from '../middleware.js';
import Validation from '../helpers.js';
import xss from 'xss';

router.route('/')
    .get(middleware.userRouteMiddleware, async(req, res) => {
        try {
            if (req.session && req.session.user) {
                const user = await profiledata.findUserById(xss(req.session.user.id));
                const states = [
                    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
                    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
                    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
                ];
                res.render('profile', { title: 'Profile', user: user, states: states });
            }

        } catch (error) {
            console.error('Error fetching profile:', error);
            res.redirect('/auth/login');
        }
    })
    .post(async(req, res) => {
        const formData = req.body;
        console.log("Route profile form Data", formData);
        var uploadPic = xss(req.body.uploadPic);
        var profilePicture = xss(req.body.profilePicture);
        var userName = xss(req.body.userName);
        var firstName = xss(req.body.firstName);
        var lastName = xss(req.body.lastName);
        var email = xss(req.body.email);
        var bio = xss(req.body.bio);
        var gender = xss(req.body.gender);
        var state = xss(req.body.state);
        var city = xss(req.body.city);
        var dob = xss(req.body.dob);
        var courses = xss(req.body.courses);
        var education = req.body.education;
        var lastuserName = xss(req.session.user.userName);



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