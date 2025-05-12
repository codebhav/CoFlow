document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('menuOverlay');
    const openGroupBtn = document.querySelector('.makeGroup');
    const groupMenu = document.getElementById('groupMenu');
    const closeGroupBtn = document.getElementById('closeMenu');
    const groupForm = document.getElementById('groupForm');
    const viewUserBtns = document.querySelectorAll('.viewUsers');
    const userMenu = document.getElementById('userMenu');
    const closeUserBtn = document.getElementById('closeUserMenu');
    const pendingList = document.getElementById('pendingList');
    const approvedList = document.getElementById('approvedList');
    const deleteBtn = document.getElementById('deleteGroupBtn');
    const leaveBtns = document.querySelectorAll('.leaveGroupBtn');
    const cancelBtns = document.querySelectorAll('.cancelReqBtn');
  
    let currentGroupId = null;
  
    const toggleMenu = (menu, show) => {
      menu.style.display = show ? 'block' : 'none';
      overlay.style.display = show ? 'block' : 'none';
    };
  
    const postJSON = (url, body) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
  

    openGroupBtn.addEventListener('click', () => toggleMenu(groupMenu, true));
    closeGroupBtn.addEventListener('click', () => toggleMenu(groupMenu, false));
  


    groupForm.addEventListener('submit', async e => {
      e.preventDefault();
      const inputs = Array.from(groupForm.querySelectorAll('input, select'));
      let valid = true;
      const data = {};
      for (const input of inputs) {
        const v = input.value.trim();
        if (!v) {
          valid = false;
          input.style.borderColor = 'red';
        } else {
          input.style.borderColor = '';
          data[input.name] = v;
        }
      }
      if (!valid) {
        alert('All fields must have valid inputs');
        return;

      }
      toggleMenu(groupMenu, false);
      groupForm.reset();
      try {
        await fetch('/groups/myGroups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } catch {
        alert('Uh oh');
      }
    });
  
    const loadPending = async () => {
      pendingList.textContent = 'Loading…';
      try {
        const res = await postJSON('/groups/pendingUsers', { groupId: currentGroupId });
        const data = await res.json();
        pendingList.innerHTML = '';
        if (!data.length) {
          pendingList.textContent = 'No pending users found';
          return;
        }
        data.forEach(([userId, username]) => {
          const row = document.createElement('div');
          row.className = 'user-row';
          row.innerHTML = `<span class="username">${username}</span> `;
          const accept = document.createElement('button');
          accept.textContent = 'Accept';
          accept.onclick = async () => {
            await postJSON('/groups/acceptUser', { userId, groupId: currentGroupId });
            loadPending();
            loadApproved();

          };
          const reject = document.createElement('button');
          reject.textContent = 'Reject';
          reject.onclick = async () => {
            await postJSON('/groups/rejectUser', { userId, groupId: currentGroupId });
            loadPending();


          };
          row.append(accept, reject);
          pendingList.appendChild(row);
        });
      } catch {
        pendingList.textContent = 'Error';
      }
    };
  
    const loadApproved = async () => {
      approvedList.textContent = 'Loading…';
      try {
        const res = await postJSON('/groups/approvedUsers', { groupId: currentGroupId });
        const data = await res.json();
        approvedList.innerHTML = '';
        if (!data.length) {
          approvedList.textContent = 'No users found';
          return;


        }


        data.forEach(([userId, username], i) => {
          const row = document.createElement('div');
          row.className = 'user-row';
          if (i === 0) {
            row.innerHTML = `<span class="username">${username}</span> <em>(Owner)</em>`;
          } else {
            row.innerHTML = `<span class="username">${username}</span> `;
            const remove = document.createElement('button');
            remove.textContent = 'Remove';
            remove.onclick = async () => {

              await postJSON('/groups/removeUser', { userId, groupId: currentGroupId });
              loadApproved();
            };
            row.append(remove);
          }
          approvedList.appendChild(row);

        });
      } catch {
        approvedList.textContent = 'Error';


      }
    };
  
    viewUserBtns.forEach(btn =>
      btn.addEventListener('click', async e => {
        e.preventDefault();
        currentGroupId = btn.closest('form').id;
        toggleMenu(userMenu, true);
        pendingList.innerHTML = '';
        approvedList.innerHTML = '';
        await loadPending();
        await loadApproved();
      })
    );
  
    closeUserBtn.addEventListener('click', () => {
      toggleMenu(userMenu, false);
      pendingList.innerHTML = '';
      approvedList.innerHTML = '';
    });
  
    deleteBtn.addEventListener('click', async () => {
      if (!currentGroupId) return;
      await postJSON('/groups/deleteGroup', { groupId: currentGroupId });
      window.location.reload();
    });
  
    overlay.addEventListener('click', () => {
      toggleMenu(groupMenu, false);
      toggleMenu(userMenu, false);
      pendingList.innerHTML = '';
      approvedList.innerHTML = '';

    });
  
    leaveBtns.forEach(btn =>
      btn.addEventListener('click', async () => {
        const form = btn.closest('form');
        if (!form?.id) return console.error('No parent form ID');
        try {
          const res = await fetch('/groups/leave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId: form.id })

          });
          if (res.ok) window.location.reload();
          else alert('Error: ' + await res.text());
        } catch {
          alert('Error encountered');

        }
      })
    );
  
    cancelBtns.forEach(btn =>
      btn.addEventListener('click', async () => {
        const form = btn.closest('form');
        if (!form?.id) return console.error('No parent form ID');
        try {
          const res = await fetch('/groups/cancelReq', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId: form.id })
            
          });
          if (res.ok) window.location.reload();
          else alert('Error: ' + await res.text());
        } catch {
          alert('SOme error encountered');
        }
      })
    );
  });
  