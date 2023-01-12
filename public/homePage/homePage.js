let pwd = (location.href).split('?pwd=')[1];
if (!pwd) alert('Error: Missing username!');
const username = pwd.split('/')[0];
if (!localStorage.getItem('ucloud')) localStorage.setItem('ucloud', JSON.stringify({ username: username }));
let currentDir = pwd;

const port = 3000;

function getAllFiles(dir) {
    let xhttp = new XMLHttpRequest();
    xhttp.open('post', `https://192.168.178.86:${port}/home/`);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.withCredentials = true;
    xhttp.send(dir);
    xhttp.onload = function() {
        let responseOBJ = JSON.parse(this.responseText);

        if (document.querySelector('section')) document.querySelector('section').remove();
        let section = document.createElement('section');
        document.querySelector('body').appendChild(section);

        let greeter = document.createElement('p');
        greeter.innerText = responseOBJ.greeter;
        section.appendChild(greeter);

        let avatar = document.createElement('img');
        avatar.src = responseOBJ.avatarPath;
        avatar.style = 'display:inline;';
        greeter.appendChild(avatar);

        displayFiles(responseOBJ.data);
    };
}

function displayFiles(responseArray) {

    if (document.querySelector('#box')) document.querySelector('#box').remove();
    let box = document.createElement("div");
    box.id='box';
    document.querySelector('body').appendChild(box);

    responseArray.forEach(file=>{
        if (file.name === 'ucloud_files.txt') return;

        const fileName = file.name.split('/').pop();
        const link = `https://192.168.178.86/users${file.linkUrl}`;
        const type = file.type;

        let fileBox = document.createElement('div');
        fileBox.class = "fileBox";
        document.querySelector('#box').appendChild(fileBox);

        if (!type) {
            let image = document.createElement('img');
            image.src = '../images_website/folderIcon.png';
            image.id = file.linkUrl;
            image.title = fileName;
            image.type = 'directory';
            image.onclick = (e) => {
                location.href = `https://192.168.178.86/homePage/homePage.html?pwd=${file.name}`;
            };
            fileBox.appendChild(image);

            let a = document.createElement('a');
            a.innerHTML = fileName + '<br>';
            a.title = file.linkUrl;
            a.onclick = (e) => {
                location.href = `https://192.168.178.86/homePage/homePage.html?pwd=${file.name}`;
            };
            fileBox.appendChild(a);
        } else {
            if (type === 'jpg' || type === 'png' || type === 'webp' || type === 'gif') {
                let image = document.createElement('img');
                image.src = link;
                fileBox.appendChild(image);
            } else if (type === 'mp4' || type === 'ogg' || type === 'webm'){
                let video = document.createElement('video');
                video.setAttribute('controls', 'true');
                fileBox.appendChild(video);
                let source = document.createElement('source');
                source.src = link;
                source.type = `video/${type}`;
                video.appendChild(source);
            } else if (type === 'pdf') {
                let iframe = document.createElement('iframe');
                iframe.src = link;
                fileBox.appendChild(iframe);
            } else if (type === 'backlink'){
                let prevDir = currentDir.split('/');
                let removeCurrectDir = prevDir.pop();
                prevDir = prevDir[prevDir.length-1];

                let prevDirPath = currentDir.split('/');
                let removeCurrectDirAgain = prevDirPath.pop();
                prevDirPath = prevDirPath.join('/');

                let image = document.createElement('img');
                image.src = '../images_website/goback.png';
                image.title = prevDir;
                image.id = prevDir;
                image.onclick = (e) => {
                    location.href = `https://192.168.178.86/homePage/homePage.html?pwd=${prevDirPath}`;
                };
                fileBox.appendChild(image);

                let a = document.createElement('a');
                a.innerHTML = prevDir;
                a.title = prevDir;
                a.onclick = (e) => {
                    location.href = `https://192.168.178.86/homePage/homePage.html?pwd=${prevDirPath}`;
                };
                fileBox.appendChild(a);
                return;
            } else {
                let image = document.createElement('img');
                image.src = '../images_website/fileIcon.png';
                fileBox.appendChild(image);
            }
    
            let downloadLink = document.createElement('a');
            downloadLink.setAttribute('download', fileName);
            downloadLink.setAttribute('href', link);
            downloadLink.innerHTML = `Download<br>`;
            downloadLink.title = fileName;
            fileBox.appendChild(downloadLink);
        }

        let renameButton = document.createElement('button');
        renameButton.innerText = 'Rename';
        renameButton.id = fileName;
        renameButton.link = file.linkUrl;
        renameButton.addEventListener('click', renameFile);
        fileBox.appendChild(renameButton);
        fileBox.appendChild(document.createElement('br'));

        let deleteBtn = document.createElement('button');
        deleteBtn.innerText = 'Delete';
        deleteBtn.id = fileName;
        deleteBtn.link = file.linkUrl;
        deleteBtn.addEventListener('click', deleteFile);
        fileBox.appendChild(deleteBtn);
    });
}

function renameFile(event) {
    let extensionArray = event.target.id.split('.');
    let extension = '';
    let type = 'directory';
    if (extensionArray.length > 1) {
        extension = extensionArray[extensionArray.length-1];
        type = 'file';
    }

    let newFileName = prompt('Enter new file name:');
    if (type == 'directory') {
        if (newFileName.split('.')[1]) alert('Since this is a directory, everything after the first dot will be dropped');
        newFileName = newFileName.split('.')[0];
    }

    let renameRequest = new XMLHttpRequest();
        
        let renameOBJ = JSON.stringify({ query: event.target.id, newFileName: newFileName, type: type, extension: extension });

        renameRequest.open(`put`, `https://192.168.178.86:${port}/rename/${renameOBJ}`);
        renameRequest.setRequestHeader("Content-type", "application/json");
        renameRequest.send(JSON.stringify({ path: event.target.link }));

        renameRequest.onload = function() {
            alert(this.responseText);
            location.href = `https://192.168.178.86/homePage/homePage.html?pwd=${currentDir}`;
        }
}

function deleteFile(event) {
    let targetType = 'file';

    if (event.target.type === 'directory') {
        targetType = 'directory';
    }

    let confirmation = confirm(`Are you sure you want to delete '${event.target.id}'?`);
    
    if (confirmation) {
        let deleteRequest = new XMLHttpRequest();
        
        let deleteOBJ = JSON.stringify({ query: event.target.id, type: targetType });

        deleteRequest.open(`delete`, `https://192.168.178.86:${port}/delete/${deleteOBJ}`);
        deleteRequest.setRequestHeader("Content-type", "application/json");
        deleteRequest.send(JSON.stringify({ path: event.target.link }));

        deleteRequest.onload = function() {
            alert(this.responseText);
            location.href = `https://192.168.178.86/homePage/homePage.html?pwd=${currentDir}`;
        }
    }
}

function displayUsers(responseArray) {
    document.querySelector('#location').innerHTML = 'Results';

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

    responseArray.forEach(user => {
        let a = document.createElement('a');
        a.href = `https://192.168.178.86/homePage/homePage.html?pwd=${user.username}`;
        a.innerText = user.username;
        box.appendChild(a);
    });
}

window.onload = () => {
    getAllFiles(JSON.stringify({ path: currentDir }));

    let domOBJ = {
        location: document.querySelector('#location'),
        logo: document.querySelector('#logo'),
        uploadForm: document.querySelector('#uploadForm'),
        uploadBtn: document.querySelector('#uploadBtn'),
        filePath: document.querySelector('#filePath'),
        clearBtn: document.querySelector('#clearBtn'),
        userFile: document.querySelector('#userFile'),
        uploadImg: document.querySelector('#uploadImg'),
        closeUpload: document.querySelector('#closeUpload'),
        searchBtn: document.querySelector('#searchBtn'),
        search_query: document.querySelector('#search_query'),
        clearSearchBtn: document.querySelector('#clearSearchBtn'),
        searchImg: document.querySelector('#searchImg'),
        searchForm: document.querySelector('#searchForm'),
        closeSearch: document.querySelector('#closeSearch'),
        path: document.querySelector('#path'),
        folderForm: document.querySelector('#folderForm'),
        createFolderBtn: document.querySelector('#createFolderBtn'),
        clearFolderBtn: document.querySelector('#clearFolderBtn'),
        folderName: document.querySelector('#folderName'),
        mkdirImg: document.querySelector('#mkdirImg'),
        closeFolder: document.querySelector('#closeFolder'),
        searchUsersImg: document.querySelector('#searchUsersImg'),
        search_usersForm: document.querySelector('#search_usersForm'),
        searchUsersBtn: document.querySelector('#searchUsersBtn'),
        clearSearchUsersBtn: document.querySelector('#clearSearchUsersBtn'),
        search_users_query: document.querySelector('#search_users_query'),
        closeSearchUsers: document.querySelector('#closeSearchUsers')
    };


    domOBJ.location.innerHTML = '/' + currentDir;

    domOBJ.logo.addEventListener('click', function() {
        let storage = JSON.parse(localStorage.getItem('ucloud'));
        location.href = `https://192.168.178.86/homePage/homePage.html?pwd=${storage.username}`;
    });

    domOBJ.uploadForm.addEventListener('click', function(e) {
        domOBJ.uploadForm.action = `https://192.168.178.86:${port}/upload/`;
    });

    domOBJ.uploadForm.click();

    domOBJ.filePath.addEventListener('click', (e)=>{
        e.target.value = currentDir;
    });

    domOBJ.filePath.click();

    domOBJ.clearBtn.addEventListener('click', function() {
        domOBJ.userFile.value = "";
    });

    domOBJ.uploadImg.addEventListener('click', function() {
        domOBJ.uploadForm.style = 'display:block;';
    });

    domOBJ.closeUpload.addEventListener('click', function() {
        domOBJ.uploadForm.style = 'display:none;';
    });

    domOBJ.searchBtn.addEventListener('click', function() {
        let searchOBJ = {
            search_query: document.querySelector('#search_query').value,
            path: currentDir
        };

        document.querySelector('#box').remove();
        let box = document.createElement("div");
        box.id='box';
        document.querySelector('body').appendChild(box);

        if (!search_query) return getAllFiles(JSON.stringify({ path: currentDir}));

        let xhttp = new XMLHttpRequest();
        xhttp.open('get', `https://192.168.178.86:${port}/search/${JSON.stringify(searchOBJ)}`);
        xhttp.withCredentials = true;
        xhttp.send(null);

        xhttp.onload = function() {
            displayFiles(JSON.parse(this.responseText));
        };
    });

    domOBJ.search_query.addEventListener('input', ()=>{
        domOBJ.searchBtn.click();
    });

    domOBJ.clearSearchBtn.addEventListener('click', function() {
        domOBJ.search_query.value = "";
        domOBJ.searchBtn.click();
    });

    domOBJ.searchImg.addEventListener('click', function() {
        domOBJ.searchForm.style = 'display:block;';
    });

    domOBJ.closeSearch.addEventListener('click', function() {
        domOBJ.searchForm.style = 'display:none;';
    });

    domOBJ.searchForm.addEventListener('mouseleave', function() {
        domOBJ.searchForm.style = 'display:none;';
    });

    domOBJ.path.addEventListener('click', (e)=>{
        e.target.value = currentDir;
    });

    domOBJ.path.click();

    domOBJ.folderForm.addEventListener('click', function() {
        domOBJ.folderForm.action = `https://192.168.178.86:${port}/mkdir/`;
    });

    domOBJ.folderForm.click();

    domOBJ.clearFolderBtn.addEventListener('click', function() {
        domOBJ.folderName.value = "";
    });

    domOBJ.mkdirImg.addEventListener('click', function() {
        domOBJ.folderForm.style = 'display:block;';
    });

    domOBJ.closeFolder.addEventListener('click', function() {
        domOBJ.folderForm.style = 'display:none;';
    });

    domOBJ.searchUsersImg.addEventListener('click', function() {
        domOBJ.search_usersForm.style = 'display:block';
    });

    domOBJ.searchUsersBtn.addEventListener('click', function() {
        let search_query = document.querySelector('#search_users_query').value;

        document.querySelector('#box').remove();
        let box = document.createElement("div");
        box.id='box';
        document.querySelector('body').appendChild(box);

        if (!search_query) return document.write('No users found!');

        let xhttp = new XMLHttpRequest();
        xhttp.open('get', `https://192.168.178.86:${port}/search_users/${search_query}`);
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

    domOBJ.closeSearchUsers.addEventListener('click', function() {
        domOBJ.search_usersForm.style = 'display:none;';
    });

    domOBJ.search_usersForm.addEventListener('mouseleave', function() {
        domOBJ.search_usersForm.style = 'display:none;';
    });

    domOBJ.search_usersForm.addEventListener('mouseleave', function() {
        domOBJ.search_usersForm.style = 'display:none;';
    });

    // Key press events
    domOBJ.uploadForm.addEventListener('keypress', e => {
        if (e.keyCode == 13) domOBJ.uploadBtn.click();
        else if (e.keyCode == 27) domOBJ.closeUpload.click();
    });

    domOBJ.searchForm.addEventListener('keypress', e => {
        if (e.keyCode == 13) domOBJ.searchBtn.click();
        else if (e.keyCode == 27) domOBJ.closeSearch.click();
    });

    domOBJ.folderForm.addEventListener('keypress', e => {
        if (e.keyCode == 13) domOBJ.createFolderBtn.click();
        else if (e.keyCode == 27) domOBJ.closeFolder.click();
    });

    domOBJ.search_usersForm.addEventListener('keypress', e => {
        if (e.keyCode == 13) domOBJ.searchUsersBtn.click();
        else if (e.keyCode == 27) domOBJ.clearSearchUsersBtn.click();
    });
}