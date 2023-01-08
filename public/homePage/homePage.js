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
    xhttp.send(dir);
    
    xhttp.onload = function() {
        let responseArray = JSON.parse(this.responseText);
        displayFiles(responseArray);
    };
}

getAllFiles(JSON.stringify({ path: currentDir }));


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
                console.log(currentDir);
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

        let deleteBtn = document.createElement('button');
        deleteBtn.innerText = 'Delete';
        deleteBtn.id = fileName;
        deleteBtn.link = file.linkUrl;
        deleteBtn.addEventListener('click', deleteFile);
        fileBox.appendChild(deleteBtn);
    });
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

window.onload = () => {
    document.querySelector('#location').innerHTML = '/' + currentDir;

    document.querySelector('#logo').addEventListener('click', function() {
        let storage = JSON.parse(localStorage.getItem('ucloud'));
        location.href = `https://192.168.178.86/homePage/homePage.html?pwd=${storage.username}`;
    });

    document.querySelector('#uploadForm').addEventListener('click', function(e) {
        document.querySelector('#uploadForm').action = `https://192.168.178.86:${port}/upload/`;
    });

    document.querySelector('#uploadForm').click();

    document.querySelector('#filePath').addEventListener('click', (e)=>{
        e.target.value = currentDir;
    });

    document.querySelector('#filePath').click();

    document.querySelector('#clearBtn').addEventListener('click', function() {
        document.querySelector('#userFile').value = "";
    });

    document.querySelector('#uploadImg').addEventListener('click', function() {
        document.querySelector('#uploadForm').style = 'display:block;';
    });

    document.querySelector('#closeUpload').addEventListener('click', function() {
        document.querySelector('#uploadForm').style = 'display:none;';
    });

    document.querySelector('#searchBtn').addEventListener('click', function() {
        let search_query = document.querySelector('#search_query').value;

        document.querySelector('#box').remove();
        let box = document.createElement("div");
        box.id='box';
        document.querySelector('body').appendChild(box);

        if (!search_query) return getAllFiles(JSON.stringify({ path: currentDir}));

        let xhttp = new XMLHttpRequest();
        xhttp.open('get', `https://192.168.178.86:${port}/search/${search_query}`);
        xhttp.send(null);

        xhttp.onload = function() {
            displayFiles(JSON.parse(this.responseText));
        };
    });

    document.querySelector('#search_query').addEventListener('input', ()=>{
        document.querySelector('#searchBtn').click();
    });

    document.querySelector('#clearSearchBtn').addEventListener('click', function() {
        document.querySelector('#search_query').value = "";
        document.querySelector('#searchBtn').click();
    });

    document.querySelector('#searchImg').addEventListener('click', function() {
        document.querySelector('#searchForm').style = 'display:block;';
    });

    document.querySelector('#closeSearch').addEventListener('click', function() {
        document.querySelector('#searchForm').style = 'display:none;';
    });

    document.querySelector('#searchForm').addEventListener('mouseleave', function() {
        document.querySelector('#searchForm').style = 'display:none;';
    });

    document.querySelector('#path').addEventListener('click', (e)=>{
        e.target.value = currentDir;
    });

    document.querySelector('#path').click();

    document.querySelector('#folderForm').addEventListener('click', function() {
        document.querySelector('#folderForm').action = `https://192.168.178.86:${port}/mkdir/`;
    });

    document.querySelector('#folderForm').click();

    document.querySelector('#clearFolderBtn').addEventListener('click', function() {
        document.querySelector('#folderName').value = "";
    });

    document.querySelector('#mkdirImg').addEventListener('click', function() {
        document.querySelector('#folderForm').style = 'display:block;';
    });

    document.querySelector('#closeFolder').addEventListener('click', function() {
        document.querySelector('#folderForm').style = 'display:none;';
    });

    // Key press events
    document.querySelector('#uploadForm').addEventListener('keypress', e => {
        if (e.keyCode == 13) document.querySelector('#uploadBtn').click();
        else if (e.keyCode == 27) document.querySelector('#closeUpload').click();
    });

    document.querySelector('#searchForm').addEventListener('keypress', e => {
        if (e.keyCode == 13) document.querySelector('#searchBtn').click();
        else if (e.keyCode == 27) document.querySelector('#closeSearch').click();
    });
}