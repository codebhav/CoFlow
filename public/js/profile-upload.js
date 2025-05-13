document.addEventListener("DOMContentLoaded", () => {
	const uploadForm = document.getElementById("profile-upload-form");
	const profileImageInput = document.getElementById("profileImage");
	const previewImage = document.getElementById("image-preview");
	const uploadBtn = document.getElementById("upload-button");
	const uploadStatus = document.getElementById("upload-status");
	const profilePictureInput = document.getElementById("profilePicture");

	// Show preview of selected image
	if (profileImageInput) {
		profileImageInput.addEventListener("change", (event) => {
			const file = event.target.files[0];
			if (!file) return;

			// Validate file type
			if (!file.type.match("image.*")) {
				showError("Please select an image file (JPEG, PNG, etc.)");
				profileImageInput.value = "";
				return;
			}

			// Validate file size (max 5MB)
			if (file.size > 5 * 1024 * 1024) {
				showError("Image file is too large. Maximum size is 5MB.");
				profileImageInput.value = "";
				return;
			}

			// Show image preview
			const reader = new FileReader();
			reader.onload = (e) => {
				if (previewImage) {
					previewImage.src = e.target.result;
					previewImage.style.display = "block";
				}
			};
			reader.readAsDataURL(file);
		});
	}

	// Handle form submission
	if (uploadForm) {
		uploadForm.addEventListener("submit", async (event) => {
			event.preventDefault();

			if (!profileImageInput.files.length) {
				showError("Please select an image to upload");
				return;
			}

			const file = profileImageInput.files[0];

			// Show loading state
			uploadBtn.disabled = true;
			uploadStatus.textContent = "Uploading...";
			uploadStatus.className = "status-uploading";

			try {
				// Create form data
				const formData = new FormData();
				formData.append("profileImage", file);

				// Send to server
				const response = await fetch("/upload/profile-picture", {
					method: "POST",
					body: formData,
				});

				const result = await response.json();

				if (result.success) {
					// Show success message
					uploadStatus.textContent = "Upload successful!";
					uploadStatus.className = "status-success";

					// Update hidden input with image URL if it exists
					if (profilePictureInput) {
						profilePictureInput.value = result.imageUrl;
					}

					// Reload page after short delay
					setTimeout(() => {
						window.location.href = "/profile";
					}, 1500);
				} else {
					showError(result.message || "Upload failed");
				}
			} catch (error) {
				console.error("Error uploading image:", error);
				showError("An error occurred during upload");
			} finally {
				uploadBtn.disabled = false;
			}
		});
	}

	// Function to show error message
	function showError(message) {
		if (uploadStatus) {
			uploadStatus.textContent = message;
			uploadStatus.className = "status-error";
		}
	}

	// Client-side image processing (resize before upload)
	// This reduces bandwidth usage and speeds up uploads
	async function processImageBeforeUpload(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);

			reader.onload = (event) => {
				const img = new Image();
				img.src = event.target.result;

				img.onload = () => {
					// Create canvas for resizing
					const canvas = document.createElement("canvas");
					const ctx = canvas.getContext("2d");

					// Calculate new dimensions (max 800x800)
					let width = img.width;
					let height = img.height;

					if (width > height && width > 800) {
						height = Math.round((height * 800) / width);
						width = 800;
					} else if (height > 800) {
						width = Math.round((width * 800) / height);
						height = 800;
					}

					// Resize image
					canvas.width = width;
					canvas.height = height;
					ctx.drawImage(img, 0, 0, width, height);

					// Get resized image as base64 string
					const dataUrl = canvas.toDataURL(file.type);

					resolve(dataUrl);
				};

				img.onerror = () => {
					reject(new Error("Failed to load image"));
				};
			};

			reader.onerror = () => {
				reject(new Error("Failed to read file"));
			};
		});
	}
});
