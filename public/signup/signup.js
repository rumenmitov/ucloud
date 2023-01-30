const encodedEmail = location.href.split('?userCode=')[1];
const email = atob(encodedEmail)

document.querySelector('#email').value = email;
