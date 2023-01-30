let userId_decoded = atob(location.href.split('?userCode=')[1]);
document.querySelector('userId_input').value = userId_decoded;
