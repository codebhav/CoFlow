document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');


    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            var userName = document.getElementById('userName').value;
            var password = document.getElementById('password').value;
            const errorUserName = document.getElementById('userName-error');
            const errorPassword = document.getElementById('password-error');
            var validinput = 1;
            try {
                errorUserName.textContent = '';
                userName = checkUserName(userName);
            } catch (e) {
                errorUserName.textContent = e;
                errorUserName.style.color = 'red';
                validinput = 0;
            }
            try {
                password = checkString(password, "password");
            } catch (e) {
                errorPassword.textContent = e;
                errorPassword.style.color = 'red';
                validinput = 0;
            }
            if (validinput) {
                loginForm.submit();
            } else {
                console.log('Form has errors. Not submitting.');
            }


        });


    }

});