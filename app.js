const  fs = require('fs'),
      path = require('path'),
      http = require('http'),
      https = require('https'),
      colors = require('colors'),
      express = require('express'),
      bodyParser = require('body-parser'),
      cors = require('cors'),
      formidable = require('formidable'),
      find = require('find'),
      open = require('open');

let homeRouter = express.Router();
homeRouter.use(bodyParser.json())
homeRouter.use(bodyParser.urlencoded({ extended: true }))
homeRouter.route('/')
.post((req, res)=>{
    let dir = req.body.path;
    let fileListPath = __dirname + '/public/' + dir + '/ucloud_files.txt';

    let filesArray;
    try {
        filesArray = fs.readFileSync(fileListPath, 'utf-8');
    } catch (e) {
        if (e.code === 'ENOENT');
        return res.redirect('https://192.168.178.86?pwd=home');
    }
    filesArray = filesArray.split('\r\n');

    let data = [];
    filesArray.forEach(file => {
        let fileType = "";
        let fileComponents = file.split('.');
        if (fileComponents.length > 1) fileType = fileComponents[fileComponents.length-1];

        let linkPath = '/' + file;

        data.push({ name: file, linkUrl: linkPath, type: fileType });
    });
    res.send(data)
    res.end();
});

let uploadRouter = express.Router();
uploadRouter.use(bodyParser.urlencoded({ extended: true }));
uploadRouter.route('/')
.post((req, res, next)=>{
    let form = formidable({ multiples: true });
    form.parse(req, (err, fields, files)=>{
        if (err) console.log(err);

        let dir = fields.filePath;
        let fileListPath = __dirname + '/public/' + dir + '/ucloud_files.txt';

        if (fields.file_name) {
            let type = '';

            let wantedExtensionsArray = fields.file_name.split('.');
            if (wantedExtensionsArray.length === 1) {
                let fileExtensionsArray = files.userFile.originalFilename.split('.');
                type = '.' + fileExtensionsArray[fileExtensionsArray.length-1];
            }

            files.userFile.originalFilename = fields.file_name + type;
        }

        let oldPath = files.userFile.filepath;
        let newPath = __dirname + '/public/' + dir + '/' + files.userFile.originalFilename;
        let name = dir + '/' + files.userFile.originalFilename;

        if (files.userFile.originalFilename.toLowerCase() === 'ucloud_files.txt') {
            res.send(`File cannot be named: <i>${files.userFile.originalFilename.toLowerCase()}</i>! Please try a different name: <a href='https://192.168.178.86/?pwd=${fields.filePath}'>Back to site</a>`);
            return next();
        }

        if (path.extname(files.userFile.originalFilename) === '.backlink') {
            res.send(`File cannot have extension: <i>.backlink</i>! Please try a different extension: <a href='https://192.168.178.86/?pwd=${fields.filePath}'>Back to site</a>`);
            return next();
        } else if (path.extname(files.userFile.originalFilename) === '.') {
            res.send(`File name cannot end on a dot! Please try a different extension: <a href='https://192.168.178.86/?pwd=${fields.filePath}'>Back to site</a>`);
            return next();
        }

        if (fs.existsSync(fileListPath)) {
            let allFilesArray = fs.readFileSync(fileListPath, 'utf-8').split('\r\n');
            for ( let item in allFilesArray ) {
                if (allFilesArray[item] === name) {
                    res.send(`File already exists! <a href='https://192.168.178.86/?pwd=${fields.filePath}'>Back to site</a>`);
                    return next();
                }
            }
        }

        if (fs.existsSync(fileListPath)) fs.writeFileSync(fileListPath, `\r\n` + name, { encoding: 'utf-8', flag: 'a' });
        else fs.writeFileSync(fileListPath, name, { encoding: 'utf-8', flag: 'w' });        

        fs.rename(oldPath, newPath, err =>{
            if (err) console.log(err);
            res.send(`File upload was successful. <a href="https://192.168.178.86/?pwd=${fields.filePath}">Back to site</a>`);
        });
    });
});

let mkdirRouter = express.Router();
mkdirRouter.use(bodyParser.urlencoded({ extended: true }))
mkdirRouter.route('/')
.post((req, res, next)=>{
    let dir = req.body.path;
    let fileListPath = __dirname + '/public/' + dir + '/ucloud_files.txt';

    let removeCurrentDir = dir.split('/').pop();

    let name = req.body.folderName;

    if (path.extname(name)) {
        res.send(`Folders cannot have extensions in their name. Please try again without the dot: <a href='https://192.168.178.86/?pwd=${req.body.path}'>Back to site</a>`);
        return next();
    }

    if (fs.existsSync(fileListPath)) {
        let allFilesArray = fs.readFileSync(fileListPath, 'utf-8').split('\r\n');
        for ( let item in allFilesArray ) {
            if (allFilesArray[item] === dir + '/' + name) {
                res.send(`Folder already exists! <a href='https://192.168.178.86/?pwd=${req.body.path}'>Back to site</a>`);
                return next();
            }
        }
    }

    fs.mkdir(__dirname + '/public/' + dir + '/' + name, (err)=>{
        if (err) console.log(err);

        fs.writeFileSync(__dirname + '/public/' + dir + '/' + name + '/ucloud_files.txt', 'back.backlink', { encoding: 'utf-8', flag: 'w' });

        if (fs.existsSync(fileListPath)) fs.writeFileSync(fileListPath, '\r\n' + dir + '/' + name, { encoding: 'utf-8', flag: 'a' });
        else fs.writeFileSync(fileListPath, dir + '/' + name, { encoding: 'utf-8', flag: 'w' });
        res.redirect(`https://192.168.178.86?pwd=${dir}`);
    });
});

let searchRouter = express.Router();
searchRouter.use(bodyParser.urlencoded({ extended: true }))
searchRouter.route('/:search_query')
.get((req, res)=>{
    let search_query = req.params['search_query'];
    let query = new RegExp(`${search_query}`, 'i');

    let searchData = [];
    find.file(query, __dirname + '/public/home/', function(searchResults) {
        searchResults.forEach(file => {
            let fileComponents = path.basename(file).split('.');
            let type = fileComponents[fileComponents.length-1];

            let filePath = path.relative(__dirname + '/public/', file).split('\\').join('/');

            searchData.push({ name: path.basename(file), linkUrl: filePath, type: type });
        });

        find.dir(query, __dirname + '/public/home/', function(searchResults) {
            searchResults.forEach(file => {
                let type = undefined;
    
                let filePath = path.relative(__dirname + '/public/', file).split('\\').join('/');
    
                searchData.push({ name: filePath, linkUrl: filePath, type: type });
            });
            res.send(searchData);
        });
    });
});

let deleteRouter = express.Router();
deleteRouter.use(bodyParser.json())
deleteRouter.use(bodyParser.urlencoded({ extended: true }))
deleteRouter.route('/:deleteOBJ')
.delete((req, res)=>{
    let dir = req.body.path;
    let prevDir = dir.split('/');
    let removeCurrentDir = prevDir.pop();
    prevDir = prevDir.join('/');

    if (prevDir[0] != '/') prevDir = '/' + prevDir;
    let fileListPath = __dirname + '/public' + prevDir + '/ucloud_files.txt';

    let queryOBJ = JSON.parse(req.params['deleteOBJ']);

    let allFilesArray = fs.readFileSync(fileListPath, 'utf-8').split('\r\n');

    if (dir[0] != '/') dir = '/' + dir;
    fs.rm(__dirname + '/public' + dir, { recursive:true }, (err)=>{
        if (err) console.log(err);
    });
    
    for ( let item in allFilesArray ) {
        if (path.basename(allFilesArray[item]) == queryOBJ.query) {
            let removed = allFilesArray.splice(item, 1);
        }
    }

    if (allFilesArray.length > 0) {
        for ( let fileName in allFilesArray) {
            if (fileName == "0") {
                fs.writeFileSync(fileListPath, allFilesArray[fileName], { encoding: 'utf-8'});
            } else {
                fs.writeFileSync(fileListPath, '\r\n' + allFilesArray[fileName], { encoding: 'utf-8', flag: 'a' });
            }
        };
    } else {
        fs.rm(fileListPath, (err)=> {
            if (err) console.log(err);
        });
    }
    res.send(`File: '${queryOBJ.query}' deleted successfully`);
});


// --- Server ---
console.clear();
let backendPort = 3000;
for ( let i = 0; i < process.argv.length; i++ ) {
    if (process.argv[i] == '-p') {
        try {
            backendPort = process.argv[i+1];
            if (backendPort == undefined) {
                backendPort = 3000;
                console.log('Port was not defined. Defaulting to port 3000\n'.red);
            }
        } catch (e) {
            console.log(e);
        }
    }
}

let sslCredentials = {
    key: fs.readFileSync(__dirname + '/sslCertificate/key.pem'),
    cert: fs.readFileSync(__dirname + '/sslCertificate/cert.pem')
};

let backend = express()
.use(cors())
.use('/home', homeRouter)
.use('/upload', uploadRouter)
.use('/mkdir', mkdirRouter)
.use('/search', searchRouter)
.use('/delete', deleteRouter);
https.createServer(sslCredentials, backend).listen(backendPort);

let frontend = express()
.use(express.static(__dirname + '/public'));

http.createServer((req, res)=>{
    res.writeHead(301, { 'Location': 'https://192.168.178.86' });
    res.end();
}).listen(80);

https.createServer(sslCredentials, frontend).listen(443);

console.log(`Frontend listening on ports 80 and 443 ✔` .green);
console.log(`Backend listening on port ${backendPort} ☁\n` .blue);
console.log(`Website: https://192.168.178.86 ⭐\n\n` .yellow);
console.log('-------------------------------\n');

open('https://192.168.178.86');