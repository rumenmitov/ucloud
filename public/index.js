function displayUsers(responseArray) {

    if (document.querySelector('#box')) document.querySelector('#box').remove();
    let body = document.querySelector('body');
    let box = document.createElement('div');
    box.id = 'box';
    body.appendChild(box);

    if (!responseArray[0]) {
        let p = document.createElement('p');
        p.innerText = 'No users found!';
        box.appendChild(p);
        return;
    }

    let userTable = document.createElement('table');
    box.appendChild(userTable);
    console.log(userTable);

    responseArray.forEach(user => {
        let userRow = document.createElement('tr');
        userTable.appendChild(userRow);

        let avatarTD = document.createElement('td');
        userRow.appendChild(avatarTD);
        let avatar = document.createElement('img');
        avatar.src = user.avatarLink;
        avatarTD.appendChild(avatar);

        let usernameTD = document.createElement('td');
        userRow.appendChild(usernameTD);
        let a = document.createElement('a');
        a.href = `https://ucloudproject.com/homePage/homePage.html?pwd=${user.username}`;
        a.innerText = user.username;
        usernameTD.appendChild(a);
    });
}

window.onload = function() {
    let domOBJ = {
        search_usersForm: document.querySelector("#search_usersForm"),
        search_users_query: document.querySelector('#search_users_query'),
        searchUsersBtn: document.querySelector('#searchUsersBtn'),
        clearSearchUsersBtn: document.querySelector('#clearSearchUsersBtn'),
        closeSearchUsers: document.querySelector('#closeSearchUsers')
    };

    domOBJ.searchUsersBtn.addEventListener('click', function() {
        let search_query = document.querySelector('#search_users_query').value;

        if (document.querySelector('#box')) document.querySelector('#box').remove();
        let box = document.createElement("div");
        box.id='box';
        document.querySelector('body').appendChild(box);

        if (!search_query) return document.write('No users found!');

        let xhttp = new XMLHttpRequest();
        xhttp.open('get', `https://ucloudproject.com/search_users/${search_query}`);
        xhttp.send(null);

        xhttp.onload = function() {
            displayUsers(JSON.parse(this.responseText));
            domOBJ.search_usersForm.style = 'display:none;';
        };
    });

    domOBJ.clearSearchUsersBtn.addEventListener('click', function() {
        domOBJ.search_users_query.value = "";
        domOBJ.searchUsersBtn.click();
    });

    // Keypresses

    domOBJ.search_usersForm.addEventListener('keypress', e => {
        if (e.keyCode == 13) domOBJ.searchUsersBtn.click();
        else if (e.keyCode == 27) domOBJ.clearSearchUsersBtn.click();
    });
}