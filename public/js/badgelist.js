async function renderBadgeList(badges, containerId) {
	const container = document.getElementById(containerId);
	if (!container) return;

	const html = `
      <div class="badge-container">
        <h3>My Badges</h3>
        <div class="badge-grid">
          ${badges
				.map(
					(badge) => `
            <div class="badge-item" key="${badge.badgeId}">
              <img src="${badge.icon}" alt="${badge.name}" class="badge-icon" />
              <p class="badge-name">${badge.name}</p>
              <p class="badge-desc">${badge.description}</p>
            </div>
          `
				)
				.join("")}
        </div>
      </div>
    `;
	container.innerHTML = html;
}

export { renderBadgeList };
