import * as userdata from '../data/user.js';
import * as admindata from '../data/admin.js';
import bcrypt from 'bcrypt';

const sampleUserData = {
    userName: "sample23",
    firstName: "John",
    lastName: "Doe",
    email: "JDoe@gmail.com",
    hashedPassword: await bcrypt.hash("12345Abcde@", 10),
    gender: "Male",
    city: "Hoboken",
    state: "NJ",
    dob: "2003-02-02",
    courses: ["Algorithms", "Data Structures", "Web Programming"],
    rating: 2.5,
    badges: ["newUser"],
    education: [{
        "school": "Stevens Institute of Technology",
        "education_level": "Master",
        "major": "Finance",
        "start_date": "01/09/2024",
        "end_date": "01/05/2026"
    }],
    terms: "one",
    privacy: "on"

}

sampleAdminData = {
    userName: "Admin_admin",
    hashedPassword: await bcrypt.hash("12345Abcde@", 10)
}

let user = await userdata.createUser(sampleUserData.userName, sampleUserData.firstName, sampleUserData.lastName,
    sampleUserData.email, sampleUserData.hashedPassword, sampleUserData.bio,
    sampleUserData.gender, sampleUserData.city, sampleUserData.state, sampleUserData.dob,
    sampleUserData.courses, sampleUserData.education, sampleUserData.terms, sampleUserData.privacy);
if (!user) throw "Error in creating seed user"
let admin = await admindata.createAdmin(sampleAdminData.userName, sampleAdminData.hashedPassword);

if (!admin) throw "Error in creating seed admin"