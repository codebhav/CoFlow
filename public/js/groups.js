document.querySelectorAll('.joinForm').forEach(form => {
  form.querySelectorAll('*').forEach(element => {
    element.addEventListener('click', event => {
      if (element.tagName.toLowerCase() === 'button') {
        event.preventDefault();
        element.textContent = 'Requested';
        element.disabled = true;

        fetch('/groups/reqJoin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ formId: form.id })
        }).catch(error => {
          console.error('Error:', error);
          element.disabled = false;
        });
      }
    });
  });
});
