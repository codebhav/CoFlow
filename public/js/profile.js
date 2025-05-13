document.addEventListener("DOMContentLoaded", () => {
	// Get elements
	const profileForm = document.getElementById("profile-form");
	const editProfileBtn = document.getElementById("edit-profile-btn");
	const saveProfileBtn = document.getElementById("save-profile-btn");
	const cancelEditBtn = document.getElementById("cancel-edit-btn");
	const addEducationBtn = document.getElementById("add-education-btn");
	const educationContainer = document.getElementById("education-container");
	const profileImageActions = document.querySelector(
		".profile-image-actions"
	);

	let educationCount = document.querySelectorAll(".education-item").length;
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
		editProfileBtn.style.display = "none";
		saveProfileBtn.style.display = "inline-block";
		cancelEditBtn.style.display = "inline-block";
		addEducationBtn.style.display = "inline-block";
		profileImageActions.style.display = "block";

		// Make all inputs editable
		const inputs = profileForm.querySelectorAll("input, textarea, select");
		inputs.forEach((input) => {
			input.removeAttribute("readonly");
			input.removeAttribute("disabled");
		});

		// Show remove buttons for education items
		const removeButtons = document.querySelectorAll(
			".remove-education-btn"
		);
		removeButtons.forEach((button) => {
			button.style.display = "inline-block";
		});

		// Attach event listeners for education buttons
		attachRemoveEducationListeners();
	}

	// Function to disable edit mode
	function disableEditMode() {
		// Show/hide buttons
		editProfileBtn.style.display = "inline-block";
		saveProfileBtn.style.display = "none";
		cancelEditBtn.style.display = "none";
		addEducationBtn.style.display = "none";
		profileImageActions.style.display = "none";

		// Make all inputs read-only
		const inputs = profileForm.querySelectorAll("input, textarea, select");
		inputs.forEach((input) => {
			input.setAttribute("readonly", true);
			if (
				input.type === "radio" ||
				input.type === "select-one" ||
				input.type === "file"
			) {
				input.setAttribute("disabled", true);
			}
		});

		// Hide remove buttons for education items
		const removeButtons = document.querySelectorAll(
			".remove-education-btn"
		);
		removeButtons.forEach((button) => {
			button.style.display = "none";
		});
	}

	// Function to restore original form data
	function restoreFormData() {
		if (originalFormData) {
			for (const [key, value] of originalFormData.entries()) {
				const field = profileForm.querySelector(`[name="${key}"]`);
				if (field) {
					if (field.type === "radio") {
						const radio = profileForm.querySelector(
							`[name="${key}"][value="${value}"]`
						);
						if (radio) radio.checked = true;
					} else if (field.type === "file") {
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
		const removeButtons = document.querySelectorAll(
			".remove-education-btn"
		);
		removeButtons.forEach((button) => {
			button.addEventListener("click", (event) => {
				event.preventDefault();
				const itemToRemove = event.target.closest(".education-item");
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
		const educationItems = document.querySelectorAll(
			"#education-container .education-item"
		);
		educationItems.forEach((item, index) => {
			item.dataset.index = index;
			item.querySelector("h3").textContent = `Education ${index + 1}`;

			// Update all input fields inside this education item
			const inputs = item.querySelectorAll("input");
			inputs.forEach((input) => {
				const nameSegments = input.name.split("[");
				if (nameSegments.length >= 3) {
					const fieldName = nameSegments[2].replace("]", "");
					input.name = `education[${index}][${fieldName}`;

					// Also update IDs if needed
					if (input.id.includes("-")) {
						const idBase = input.id.split("-")[0];
						input.id = `${idBase}-${index}`;
					}
				}
			});

			// Update remove button data-index
			const removeButton = item.querySelector(".remove-education-btn");
			if (removeButton) {
				removeButton.dataset.index = index;
			}
		});
	}

	// Function to validate form fields
	function validateForm() {
		let isValid = true;

		// Reset all error messages
		document
			.querySelectorAll(".error-message")
			.forEach((el) => (el.textContent = ""));

		// Validate username
		const userName = document.getElementById("userName").value;
		if (!userName || userName.trim().length === 0) {
			document.getElementById("userName-error").textContent =
				"Username is required";
			isValid = false;
		} else if (userName.length < 5 || userName.length > 20) {
			document.getElementById("userName-error").textContent =
				"Username must be between 5 and 20 characters";
			isValid = false;
		}

		// Validate first name
		const firstName = document.getElementById("firstName").value;
		if (!firstName || firstName.trim().length === 0) {
			document.getElementById("firstName-error").textContent =
				"First name is required";
			isValid = false;
		}

		// Validate last name
		const lastName = document.getElementById("lastName").value;
		if (!lastName || lastName.trim().length === 0) {
			document.getElementById("lastName-error").textContent =
				"Last name is required";
			isValid = false;
		}

		// Validate email
		const email = document.getElementById("email").value;
		if (!email || email.trim().length === 0) {
			document.getElementById("email-error").textContent =
				"Email is required";
			isValid = false;
		} else if (!isValidEmail(email)) {
			document.getElementById("email-error").textContent =
				"Please enter a valid email address";
			isValid = false;
		}

		// Validate education entries
		const educationItems = document.querySelectorAll(".education-item");
		educationItems.forEach((item, index) => {
			const schoolName = item.querySelector(
				`[name="education[${index}][schoolName]"]`
			).value;
			if (schoolName.trim().length === 0) {
				document.getElementById("education-error").textContent =
					"School name is required for all education entries";
				isValid = false;
			}

			const startDate = item.querySelector(
				`[name="education[${index}][startDate]"]`
			).value;
			const endDate = item.querySelector(
				`[name="education[${index}][endDate]"]`
			).value;

			if (startDate && endDate && startDate > endDate) {
				document.getElementById("education-error").textContent =
					"End date cannot be before start date";
				isValid = false;
			}
		});

		return isValid;
	}

	// Helper function to validate email format
	function isValidEmail(email) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	// Event Listeners
	if (editProfileBtn) {
		editProfileBtn.addEventListener("click", (event) => {
			event.preventDefault();
			enableEditMode();
		});
	}

	if (cancelEditBtn) {
		cancelEditBtn.addEventListener("click", (event) => {
			event.preventDefault();
			restoreFormData();
			disableEditMode();
		});
	}

	if (addEducationBtn) {
		addEducationBtn.addEventListener("click", (event) => {
			event.preventDefault();
			if (educationCount < maxEducation) {
				educationContainer.insertAdjacentHTML(
					"beforeend",
					createEducationItem(educationCount)
				);
				educationCount++;
				attachRemoveEducationListeners();
			} else {
				alert(
					`You can add a maximum of ${maxEducation} education entries.`
				);
			}
		});
	}

	if (profileForm) {
		saveProfileBtn.addEventListener("click", (event) => {
			event.preventDefault();

			if (validateForm()) {
				profileForm.submit();
			}
		});
	}

	// Populate state dropdown if needed
	const stateDropdown = document.getElementById("state");
	if (stateDropdown && stateDropdown.options.length <= 1) {
		const states = [
			"AL",
			"AK",
			"AZ",
			"AR",
			"CA",
			"CO",
			"CT",
			"DE",
			"FL",
			"GA",
			"HI",
			"ID",
			"IL",
			"IN",
			"IA",
			"KS",
			"KY",
			"LA",
			"ME",
			"MD",
			"MA",
			"MI",
			"MN",
			"MS",
			"MO",
			"MT",
			"NE",
			"NV",
			"NH",
			"NJ",
			"NM",
			"NY",
			"NC",
			"ND",
			"OH",
			"OK",
			"OR",
			"PA",
			"RI",
			"SC",
			"SD",
			"TN",
			"TX",
			"UT",
			"VT",
			"VA",
			"WA",
			"WV",
			"WI",
			"WY",
		];
		states.forEach((state) => {
			const option = document.createElement("option");
			option.value = state;
			option.textContent = state;
			stateDropdown.appendChild(option);
		});
	}
});
