let xhttp = new XMLHttpRequest();
xhttp.open('get', 'https://ucloudproject.com/checkLogin/');
xhttp.setRequestHeader("Content-type", "application/json");
xhttp.withCredentials = true;
xhttp.send(null);

xhttp.onload = function() {
	if (this.responseText) location.href = 'https://ucloudproject.com/homePage/homePage.html?pwd=' + this.responseText;
};


