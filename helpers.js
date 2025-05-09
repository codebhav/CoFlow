import { ObjectId } from 'mongodb';

const exportedMethods = {
    checkId(id, varName) {
        if (!id) throw `Error: You must provide a ${varName}`;
        if (typeof id !== 'string') throw `Error:${varName} must be a string`;
        id = id.trim();
        if (id.length === 0)
            throw `Error: ${varName} cannot be an empty string or just spaces`;
        if (!ObjectId.isValid(id)) throw `Error: ${varName} invalid object ID`;
        return id;
    },

    checkString(strVal, varName) {
        if (!strVal) throw `Error: You must supply a ${varName}!`;
        if (typeof strVal !== 'string') throw `Error: ${varName} must be a string!`;
        strVal = strVal.trim();
        if (strVal.length === 0)
            throw `Error: ${varName} cannot be an empty string or string with just spaces`;
        if (!isNaN(strVal))
            throw `Error: ${strVal} is not a valid value for ${varName} as it only contains digits`;
        return strVal;
    },

    checkStringArray(arr, varName) {
        //We will allow an empty array for this,
        //if it's not empty, we will make sure all tags are strings
        if (!arr || !Array.isArray(arr))
            throw `You must provide an array of ${varName}`;
        for (let i in arr) {
            if (typeof arr[i] !== 'string' || arr[i].trim().length === 0) {
                throw `One or more elements in ${varName} array is not a string or is an empty string`;
            }
            arr[i] = arr[i].trim();
        }

        return arr;
    },
    checkNumber(number) {
        if (!number) throw "Input must be provided"
        if (number.trim().length === 0)
            throw 'Input cannot be just spaces';
        number = Number(number) // Convert string to Int
        if (!number) throw "Input Must Be a Number";
        if (!Number.isInteger(number)) throw " Input Must Be an Integer"
        if (typeof number !== "number") throw 'input must be a number';
        return number;
    },
    checkEmail(email) {
        if (!email) throw 'Error: You must provide an email address';
        if (typeof email !== 'string') throw 'Error: Email must be a string';
        email = email.trim();
        if (email.length === 0) throw 'Error: Email cannot be an empty string or just spaces';

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailRegex.test(email)) {
            throw 'Error: Invalid email format';
        }

        return email.toLowerCase();
    },
    checkDate(date, birth) {
        if (date === null || date === undefined)
            throw new Error("Date cannot be null or undefined");
        if (typeof date !== 'string')
            throw new Error("Date must be a string");

        date = date.trim();
        if (date === '')
            throw new Error("Date cannot be empty");

        const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
        const match = date.match(dateRegex);

        if (!match) {
            throw new Error("Date must be in format YYYY-MM-DD");
        }

        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        const current = new Date();
        if (year <= 1990 && yeat <= current.getFullYear()) {
            throw new Error("Year must be in correct range");
        }

        if (month < 1 || month > 12) {
            throw new Error("Month must be between 01 and 12");
        }
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day < 1 || day > daysInMonth) {
            throw new Error(`Day must be between 01 and ${daysInMonth} for the given month`);
        }

        const dateValid = new Date(year, month - 1, day); // month is 0-indexed in Date
        if (
            dateValid.getFullYear() !== year ||
            dateValid.getMonth() !== month - 1 ||
            dateValid.getDate() !== day
        ) {
            throw new Error("Invalid date: The provided year, month, and day do not form a valid date.");
        }
        if (birth && dateValid >= current) throw "Invalidate date: birthday can't be later than today"
        const formattedMonth = month.toString().padStart(2, '0');
        const formattedDay = day.toString().padStart(2, '0');

        return `${year}-${formattedMonth}-${formattedDay}`;
    },
    checkGender(gender) {

        if (gender === null || gender === undefined) {
            throw new Error("Gender cannot be null or undefined");
        }
        if (typeof gender !== 'string') {
            throw new Error("Gender must be a string");
        }
        gender = gender.trim();
        if (gender.length == 0) {
            throw new Error("Gender cannot be empty");
        }
        const validgender = ['male', 'female', 'other'];
        const resgender = gender.toLowerCase();

        if (!validgender.includes(resgender)) {
            throw new Error("Gender must be in: Male, Female, Other");
        }
        return resgender;
    },
    checkCity(state, city) {

    },
    checkState(state) {

    },
    checkEducation(education) {
        if (!education) return [];
        if (!Array.isArray(education)) throw 'Error: Education must be an array';
        const validatedEducation = education.filter(entry => {
            // Skip completely empty objects or non-objects
            if (!entry || typeof entry !== 'object' || Object.keys(entry).length === 0) {
                return false;
            }
            // skip withou school Name object
            if (!entry.schoolName || entry.schoolName.trim().length === 0) {
                return false;
            }

            return true;
        }).map(entry => {

            const validatedEntry = {};

            validatedEntry.schoolName = this.checkString(entry.schoolName, 'School Name');

            if (entry.educationLevel && entry.educationLevel.trim().length > 0) {
                validatedEntry.educationLevel = this.checkString(entry.educationLevel, 'Education Level');
            } else {
                validatedEntry.educationLevel = '';
            }
            if (entry.major && entry.major.trim().length > 0) {
                validatedEntry.major = this.checkString(entry.major, 'Major');
            } else {
                validatedEntry.major = '';
            }

            // Validate start date if provided
            if (entry.startDate && entry.startDate.trim().length > 0) {
                validatedEntry.startDate = this.checkDate(entry.startDate);
            } else {
                validatedEntry.startDate = '';
            }
            if (entry.endDate && entry.endDate.trim().length > 0) {
                validatedEntry.endDate = this.checkDate(entry.endDate);
            } else {
                validatedEntry.endDate = '';
            }
            return validatedEntry;
        });

        return validatedEducation;
    },
    checkUserName(userName) {
        if (!userName) throw `Error: You must supply a userName!`;
        if (typeof userName !== 'string') throw `Error: userName must be a string!`;
        userName = userName.trim();
        if (userName.length === 0)
            throw `Error: userName cannot be an empty string or string with just spaces`;
        if (!isNaN(userName))
            throw `Error: userName is not a valid value for userName as it only contains digits`;
        if (userName.length >= 20 || userName.length < 5)
            throw `Error: userName must be at least 5 character and at most 20 character`;
        return userName;
    },

    checkPassword(password) {
        const uppercaseChar = /[A-Z]/;
        const lowercaseChar = /[a-z]/;
        const digitChar = /[0-9]/;
        const specialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
        if (!password) throw `Error: You must supply a password!`;
        if (typeof password !== 'string') throw `Error: password must be a string!`;
        password = password.trim();
        if (password.length === 0)
            throw `Error: password cannot be an empty string or string with just spaces`;
        if (password.length < 8)
            throw `Error: password must be at least 8 characters`;
        if (!digitChar.test(password))
            throw `Error: password must have at lease one number`;
        if (!uppercaseChar.test(password))
            throw `Error: password must have at lease one UpperCase Character`;
        if (!lowercaseChar.test(password))
            throw `Error: password must have at lease one LowerCase Character`;
        if (!specialChar.test(password))
            throw `Error: password must have at lease one Special Character`;

        return password;
    },
    getAge(dob) {
        dob = this.checkDate(dob);
        dob = new Date(dob);
        if (isNaN(dob.getTime())) {
            throw "Invalid date"
        }
        const now = new Date();

        let age = now.getFullYear() - dob.getFullYear();

        const monthdif = now.getMonth() - dob.getMonth();
        if (monthdif < 0 || (monthdif === 0 && now.getDate() < dob.getDate())) {
            age = age - 1;
        }

        return age;
    },
    checkImageUrl(imageurl) {
        return imageurl;
    },
    checkUrl(url) {
        return url;
    }
};

export default exportedMethods;