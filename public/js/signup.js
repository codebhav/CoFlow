document.addEventListener('DOMContentLoaded', () => {

    const signupForm = document.getElementById('signup-form');
    const addEducationBtn = document.getElementById('add-education-btn');
    const educationContainer = document.getElementById('education-container');
    const signupBtn = document.getElementById('signupBtn');
    let educationCount = 1;
    const maxEducation = 5;
    const tooltipIcon = document.querySelector('.tooltip-icon');
    const passwordTooltip = document.getElementById('password-tooltip');
    tooltipIcon.addEventListener('mouseenter', () => {
        passwordTooltip.style.display = 'block';
    });

    tooltipIcon.addEventListener('mouseleave', () => {
        passwordTooltip.style.display = 'none';
    });
    // Function to generate a new education item HTML
    function createEducationItem(index) {
        return `
            <div class="education-item">
                <h3>Education ${index + 1}</h3>
                <div class="nested-form-group">
                    <label for="school-${index}">School Name:</label>
                    <input type="text" id="school-${index}" name="education[${index}][schoolName]">
                </div>
                <div class="nested-form-group">
                    <label for="educationLevel-${index}">Education Level:</label>
                    <input type="text" id="educationLevel-${index}" name="education[${index}][educationLevel]">
                </div>
                <div class="nested-form-group">
                    <label for="major-${index}">Major:</label>
                    <input type="text" id="major-${index}" name="education[${index}][major]">
                </div>
                <div class="nested-form-group">
                    <label for="startDate-${index}">Start Date:</label>
                    <input type="date" id="startDate-${index}" name="education[${index}][startDate]">
                </div>
                <div class="nested-form-group">
                    <label for="endDate-${index}">End Date:</label>
                    <input type="date" id="endDate-${index}" name="education[${index}][endDate]">
                </div>
                <button type="button" class="remove-education-btn" data-index="${index}">- Remove</button>
            </div>
        `;
    }

    // Event listener for adding education
    addEducationBtn.addEventListener('click', (event) => {
        event.preventDefault();
        if (educationCount < maxEducation) {
            educationContainer.insertAdjacentHTML('beforeend', createEducationItem(educationCount));
            educationCount++;
            attachRemoveEducationListeners();
        } else {
            alert(`You can add a maximum of ${maxEducation} education entries.`);
        }
        reIndexEducationItems();
    });

    // Function to attach event listeners to remove education buttons
    function attachRemoveEducationListeners() {
        const removeButtons = document.querySelectorAll('.remove-education-btn');
        removeButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const indexToRemove = parseInt(event.target.dataset.index);
                const itemToRemove = event.target.closest('.education-item');
                if (itemToRemove) {
                    itemToRemove.remove();
                    // Re-index remaining education items for correct form submission
                    reIndexEducationItems();
                    educationCount--;
                }
            });
        });
    }

    // Function to re-index education items after removal
    function reIndexEducationItems() {
        const educationItems = document.querySelectorAll('.education-item');
        educationItems.forEach((item, index) => {
            item.querySelector('h3').textContent = `Education ${index + 1}`;
            item.querySelectorAll('[id^="school-"]').forEach(el => el.id = `school-${index}`);
            item.querySelectorAll('[name^="education["]').forEach(el => {
                const parts = el.name.split('[')[2];
                el.name = `education[${index}][${parts}`;
            });
            const removeButton = item.querySelector('.remove-education-btn');
            removeButton.dataset.index = index;
        });
    }

    // Populate state dropdown (replace with your actual data or API call)
    const stateDropdown = document.getElementById('state');
    const states = [
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
        "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
        "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
    ];
    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        stateDropdown.appendChild(option);
    });

    if (signupForm) {
        signupBtn.addEventListener('click', (event) => {
            event.preventDefault();
            const formData = new FormData(signupForm);

            const userName = formData.get('userName');
            const firstName = formData.get('firstName');
            const lastName = formData.get('lastName');
            const email = formData.get('email');
            const password = formData.get('password');
            const bio = formData.get('bio');
            const gender = formData.get('gender');
            const state = formData.get('state');
            const city = formData.get('city');
            const dob = formData.get('dob');
            const courses = formData.get('courses');
            const terms = formData.get('terms');
            const privacy = formData.get('privacy');

            var userNameError = document.getElementById('userName-error');
            var firstNameError = document.getElementById('firstName-error');
            var lastNameError = document.getElementById('lastName-error');
            var emailError = document.getElementById('email-error');
            var passwordError = document.getElementById('password-error');
            var bioError = document.getElementById('bio-error');
            var genderError = document.getElementById('gender-error');
            var stateError = document.getElementById('state-error');
            var cityError = document.getElementById('city-error');
            var dobError = document.getElementById('dob-error');
            var coursesError = document.getElementById('courses-error');
            var educationError = document.getElementById('education-error');
            var termsError = document.getElementById('terms-error');
            var privacyError = document.getElementById('privacy-error');

            userNameError.textContent = '';
            firstNameError.textContent = '';
            lastNameError.textContent = '';
            emailError.textContent = '';
            passwordError.textContent = '';
            bioError.textContent = '';
            genderError.textContent = '';
            cityError.textContent = '';
            stateError.textContent = '';
            dobError.textContent = '';
            coursesError.textContent = '';
            educationError.textContent = '';

            var isFormValid = true;
            try {
                userNameError.textContent = '';
                checkUserName(userName);
            } catch (e) {
                userNameError.textContent = e;
                isFormValid = false;
            }
            try {
                checkPassword(password, "password");
            } catch (e) {
                passwordError.textContent = e;
                isFormValid = false;
            }
            try {
                checkString(firstName, "First Name");
            } catch (e) {
                firstNameError.textContent = e;
                isFormValid = false;
            }

            try {
                checkString(lastName, "Last Name");
            } catch (e) {
                lastNameError.textContent = e;
                isFormValid = false;
            }
            try {
                checkEmail(email);
            } catch (e) {
                emailError.textContent = e;
                isFormValid = false;
            }
            try {
                bio ? checkString(bio) : "";
            } catch (e) {
                bioError.textContent = e;
                isFormValid = false;
            }

            //Gender
            try {
                gender ? checkGender(gender) : "";
            } catch (e) {
                genderError.textContent = e;
                isFormValid = false;
            }

            //State
            try {
                checkState(state);
            } catch (e) {
                stateError.textContent = e;
                isFormValid = false;
            }

            // City
            try {
                checkCity(city);
            } catch (e) {
                cityError.textContent = e;
                isFormValid = false;
            }

            //dob
            try {
                console.log(dob)
                dob ? checkDate(dob, 1) : '';
            } catch (e) {
                dobError.textContent = e;
                isFormValid = false;
            }

            //courses
            try {
                courses ? checkStringArray(courses.trim().split(','), "Courses") : '';
            } catch (e) {
                coursesError.textContent = e;
                isFormValid = false;
            }

            const educations = document.querySelectorAll('.education-item');
            if (educations) {

                educations.forEach((edu, index) => {
                    console.log(edu, index)
                    var schoolName = edu.querySelector(`[name="education[${index}][schoolName]"]`);
                    var schoolName = schoolName ? schoolName.value : "";
                    var educationLevel = edu.querySelector(`[name="education[${index}][educationLevel]"]`);
                    var educationLevel = educationLevel ? educationLevel.value : "";
                    var major = edu.querySelector(`[name="education[${index}][major]"]`);
                    var major = major ? major.value : "";
                    var startDate = edu.querySelector(`[name="education[${index}][startDate]"]`);
                    var startDate = startDate ? startDate.value : "";
                    var endDate = edu.querySelector(`[name="education[${index}][endDate]"]`);
                    var endDate = endDate ? endDate.value : "";
                    try {
                        checkString(schoolName, `Education-${index + 1} School Name`);
                        educationLevel ? checkString(educationLevel, `Education-${index + 1} Education Level`) : "";
                        major ? checkString(major, `Education-${index + 1} Major`) : "";
                        startDate ? checkDate(startDate, `Education-${index + 1} Start Date`) : "";
                        endDate ? checkDate(endDate, `Education-${index + 1} End Date`) : "";
                    } catch (error) {
                        educationError.textContent += error + '; ';
                        isFormValid = false;
                    }
                })
            };

            try {
                if (privacy != 'on') throw 'privacy must be agreed'
            } catch (e) {
                privacyError.textContent = e;
                isFormValid = false;
            }
            try {
                if (terms != 'on') throw 'term must be agreed'
            } catch (e) {
                termsError.textContent = e;
                isFormValid = false;
            }
            if (isFormValid) {
                signupForm.submit();
            } else {
                console.log('Form has errors.');
            }


        });


    }


    attachRemoveEducationListeners();
});