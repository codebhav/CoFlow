document.querySelectorAll(".joinForm").forEach((form) => {
	form.querySelectorAll("*").forEach((element) => {
		element.addEventListener("click", (event) => {
			if (element.tagName.toLowerCase() === "button") {
				event.preventDefault();
				const originalText = element.textContent;
				element.textContent = "Requesting...";
				element.disabled = true;

				fetch("/groups/reqJoin", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Requested-With": "XMLHttpRequest",
					},
					body: JSON.stringify({ formId: form.id }),
				})
					.then((response) => response.json())
					.then((data) => {
						if (data.success) {
							element.textContent = "Requested";
							element.disabled = true;
						} else {
							throw new Error(
								data.message || "Failed to join group"
							);
						}
					})
					.catch((error) => {
						console.error("Error:", error);
						element.textContent = originalText;
						element.disabled = false;
						alert(
							error.message ||
								"Failed to join group. Please try again."
						);
					});
			}
		});
	});
});
