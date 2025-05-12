document.addEventListener('DOMContentLoaded', () => {
    // Get elements

    const profileForm = document.getElementById('profile-form');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const addEducationBtn = document.getElementById('add-education-btn');
    const educationContainer = document.getElementById('education-container');
    let educationCount = document.querySelectorAll('.education-item').length;
    const maxEducation = 5;

    // Initial form state
    let originalFormData = null;

    // Function to create a new education item
    function createEducationItem(index) {
        return `
            <div class="education-item" data-index="${index}">
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

    // Function to enable edit mode
    function enableEditMode() {
        // Save original form data for cancel functionality
        originalFormData = new FormData(profileForm);

        // Show/hide buttons
        editProfileBtn.style.display = 'none';
        saveProfileBtn.style.display = 'inline-block';
        cancelEditBtn.style.display = 'inline-block';
        addEducationBtn.style.display = 'inline-block';

        // Make all inputs editable
        const inputs = profileForm.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.removeAttribute('readonly');
            input.removeAttribute('disabled');
        });

        // Show remove buttons for education items
        const removeButtons = document.querySelectorAll('.remove-education-btn');
        removeButtons.forEach(button => {
            button.style.display = 'inline-block';
        });

        // Attach event listeners for education buttons
        attachRemoveEducationListeners();
    }

    // Function to disable edit mode
    function disableEditMode() {
        // Show/hide buttons
        editProfileBtn.style.display = 'inline-block';
        saveProfileBtn.style.display = 'none';
        cancelEditBtn.style.display = 'none';
        addEducationBtn.style.display = 'none';

        // Make all inputs read-only
        const inputs = profileForm.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.setAttribute('readonly', true);
            console.log(input.type);
            if (input.type === 'radio' || input.type === 'select-one' || input.type === 'file') {
                input.setAttribute('disabled', true);
            }
        });

        // Hide remove buttons for education items
        const removeButtons = document.querySelectorAll('.remove-education-btn');
        removeButtons.forEach(button => {
            button.style.display = 'none';
        });
    }

    // Function to restore original form data
    function restoreFormData() {
        if (originalFormData) {
            for (const [key, value] of originalFormData.entries()) {
                const field = profileForm.querySelector(`[name="${key}"]`);
                if (field) {
                    if (field.type === 'radio') {
                        const radio = profileForm.querySelector(`[name="${key}"][value="${value}"]`);
                        if (radio) radio.checked = true;
                    } else if (field.type === 'file') {
                        field.value = "";
                    } else {
                        field.value = value;
                    }
                }
            }
        }

        // Restore education items by reloading the page
        location.reload();
    }

    // Function to attach event listeners to remove education buttons
    function attachRemoveEducationListeners() {
        const removeButtons = document.querySelectorAll('.remove-education-btn');
        removeButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
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
        const educationItems = document.querySelectorAll('#education-container .education-item');
        educationItems.forEach((item, index) => {
            item.dataset.index = index;
            item.querySelector('h3').textContent = `Education ${index + 1}`;

            // Update all input fields inside this education item
            const inputs = item.querySelectorAll('input');
            inputs.forEach(input => {
                const fieldName = input.name.split('[')[2].replace(']', '');
                input.name = `education[${index}][${fieldName}`;

                // Also update IDs if needed
                if (input.id.includes('-')) {
                    const idBase = input.id.split('-')[0];
                    input.id = `${idBase}-${index}`;
                }
            });

            // Update remove button data-index
            const removeButton = item.querySelector('.remove-education-btn');
            if (removeButton) {
                removeButton.dataset.index = index;
            }
        });
    }



    // Event Listeners
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', (event) => {
            event.preventDefault();
            enableEditMode();
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', (event) => {
            event.preventDefault();
            restoreFormData();
            disableEditMode();
        });
    }

    if (addEducationBtn) {
        addEducationBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (educationCount < maxEducation) {
                educationContainer.insertAdjacentHTML('beforeend', createEducationItem(educationCount));
                educationCount++;
                attachRemoveEducationListeners();
            } else {
                alert(`You can add a maximum of ${maxEducation} education entries.`);
            }
        });
    }
    var uploadPic = document.getElementById('uploadPic') //input
    var shownPic = document.getElementById("shownPic") // img
    var profilePicture = document.getElementById("profilePicture") // text img
    uploadPic.addEventListener('change', function() {
        if (uploadPic.files[0]) {
            if (!uploadPic || !shownPic) {
                console.error('Element not found:', {
                    uploadPic: uploadPic,
                    shownPic: shownPic
                });
                return;
            }

            const cloudName = 'dknqbw5qg';
            const uploadPreset = 'coflow'; // Your preset name
            const fd = new FormData();

            fd.append('file', uploadPic.files[0]);
            fd.append('upload_preset', uploadPreset);
            fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                    method: 'POST',
                    body: fd
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    // Upload successful
                    shownPic.src = data.secure_url;
                    profilePicture.value = data.secure_url;
                    console.log("picture upload successfully")
                })
                .catch(error => {
                    console.error('Error uploading to Cloudinary:', error);
                    console.log('Error uploading image. Please try again.', 'error');
                });


        }
    });


    if (profileForm) {
        saveProfileBtn.addEventListener('click', (event) => {
            event.preventDefault();


            var formData = new FormData(profileForm);
            const userName = formData.get('userName');
            const firstName = formData.get('firstName');
            const lastName = formData.get('lastName');
            const email = formData.get('email');
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
            var bioError = document.getElementById('bio-error');
            var genderError = document.getElementById('gender-error');
            // var stateError = document.getElementById('state-error');
            // var cityError = document.getElementById('city-error');
            var dobError = document.getElementById('dob-error');
            var coursesError = document.getElementById('courses-error');
            var educationError = document.getElementById('education-error');

            userNameError.textContent = '';
            firstNameError.textContent = '';
            lastNameError.textContent = '';
            emailError.textContent = '';
            bioError.textContent = '';
            genderError.textContent = '';
            // stateError
            // cityError
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

            //City
            try {
                checkCity(city);
            } catch (e) {
                cityError.textContent = e;
                isFormValid = false;
            }

            //dob
            try {
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
                    var schoolName = edu.querySelector(`[name="education[${index}][schoolName]"]`);
                    schoolName = schoolName ? schoolName.value : ""
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

            if (isFormValid) {
                profileForm.submit();
            } else {
                console.log('Form has errors.');
            }

        });
    }



});