const fs = require("fs"),
  path = require("path"),
  folderSize = require('fast-folder-size'),
  http = require("http"),
  https = require("https"),
  colors = require("colors"),
  express = require("express"),
  bodyParser = require("body-parser"),
  cookieSession = require('cookie-session'),
  cors = require("cors"),
  nodemailer = require("nodemailer"),
  mongodb = require("mongodb"),
  formidable = require("formidable"),
  find = require("find"),
  replace = require("replace-in-file"),
  open = require("open");

// Nodemailer Config
const auth = {
  user: "rumenchopriv@gmail.com",
  pass: "dfhmfmwiqapknzek",
};

let mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: auth,
});

// MongoDB Config
const AtlasUrl =
  "mongodb+srv://root:LbCvdPPowUnAtte8@ucloud.omjbojj.mongodb.net/?retryWrites=true&w=majority";
const client = new mongodb.MongoClient(AtlasUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: mongodb.ServerApiVersion.v1,
});

let verifyRouter = express.Router();
verifyRouter.use(bodyParser.urlencoded({ extended: true }));
verifyRouter.route("/").post((req, res) => {
  let encodedEmail = Buffer.from(req.body.email).toString('base64');
  mailTransporter.sendMail(
    {
      from: auth.user,
      to: req.body.email,
      subject: "UCloud Verification",
      html: `<a href='https://ucloudproject.com/signup/signup.html?userCode=${encodedEmail}'>Verify</a>`,
    },
    (err) => {
      if (err) console.log(err);

      res.send("Verification email sent. Check your inbox.");
    }
  );
});

let signupRouter = express.Router();
signupRouter.use(bodyParser.urlencoded({ extended: true }));
signupRouter.route("/").post((req, res, next) => {
  if (!req.body.email) {
    res.send(
      "Invlid email. Please try with a valid email address: <a href=`https://ucloudproject.com/verification/verification.html`>Click here to verify</a>"
    );
    return next();
  }

  if (req.body.password !== req.body.password_confirm) {
    res.send(
      `Passwords do not match! <a href='https://ucloudproject.com/signup/signup.html?userCode=${Buffer.from(req.body.email).toString('base64')}'>Try again!</a>`
    );
    return next();
  }

  req.body.firstName = req.body.firstName.toUpperCase();
  req.body.lastName = req.body.lastName.toUpperCase();
  req.body.email = req.body.email.toLowerCase();

  client.connect((err) => {
    if (err) console.log(err);

    let usersCollection = client.db("ucloud").collection("users");

    usersCollection.find({ email: req.body.email }).toArray((err, results) => {
      if (err) console.log(err);

      if (results[0]) {
        res.send("Oops! Email is already in use.");
        client.close();
        return next();
      } else {
        usersCollection
          .find({ username: req.body.username })
          .toArray((err, results) => {
            if (err) console.log(err);

            if (results[0]) {
              res.send(
                "Oops! Username already taken. Please try with another one"
              );
              client.close();
              return next();
            }

            usersCollection.insertOne(req.body, (err) => {
              if (err) console.log(err);

              fs.mkdir(
                __dirname + "/public/.gitignore/users/" + req.body.username,
                (err) => {
                  if (err) console.log(err);

                  fs.mkdir(
                    __dirname +
                      "/public/.gitignore/users/" +
                      req.body.username +
                      "/." +
                      req.body.username,
                    (err) => {
                      if (err) console.log(err);

                      fs.writeFileSync(
                        __dirname +
                          "/public/.gitignore/users/" +
                          req.body.username +
                          "/." +
                          req.body.username +
                          "/ucloud_greeter.txt",
                        `Hello ` + req.body.firstName,
                        { encoding: "utf-8", flag: "w" }
                      );

                      req.session.username = req.body.username;
                      res.redirect(
                        `https://ucloudproject.com/homePage/homePage.html?pwd=${req.body.username}`
                      );
                      client.close();
                    }
                  );
                }
              );
            });
          });
      }
    });
  });
});

let loginRouter = express.Router();
loginRouter.use(bodyParser.urlencoded({ extended: true }));
loginRouter.route("/").post((req, res, next) => {
  client.connect((err) => {
    if (err) console.log(err);

    let usersCollection = client.db("ucloud").collection("users");
    usersCollection
      .find({
        $or: [{ email: req.body.username }, { username: req.body.username }],
      })
      .toArray((err, results) => {
        if (err) console.log(err);

        if (!results[0]) {
          res.send(
            'Username and password do not match. <a href="https://ucloudproject.com/login/login.html">Try again</a>'
          );
          client.close();
          return next();
        } else {
          if (results[0].password == req.body.password) {
            req.session.username = results[0].username;
            res.redirect(
              `https://ucloudproject.com/homePage/homePage.html?pwd=${results[0].username}`
            );
          } else {
            res.send(
              'Username and password do not match. <a href="https://ucloudproject.com/login/login.html">Try again</a>'
            );
          }

          client.close();
          return next();
        }
      });
  });
});

let userExistsRouter = express.Router();
userExistsRouter.use(bodyParser.json());
userExistsRouter.use(bodyParser.urlencoded({ extended: true }));
userExistsRouter.route('/').post((req, res)=>{
  client.connect(err =>{
    if (err) console.log(err);

    let usersCollection = client.db('ucloud').collection('users');
    usersCollection.find({ 'username': req.body.user }).toArray((err, results)=>{
      if (err) console.log(err);

      if (!results[0]) res.send({ error: 'Error! User does not exit!' });
      folderSize(__dirname + `/public/.gitignore/users/${req.body.user}`, (err, bytes)=>{
        if (err) console.log(err);

        res.send({ freeSpace: 1000000000-bytes });
        client.close();
        res.end();
      })
    });
  });
});

let homeRouter = express.Router();
homeRouter.use(bodyParser.json());
homeRouter.use(bodyParser.urlencoded({ extended: true }));
homeRouter.route("/").post((req, res) => {
  let dir = req.body.path;
  let fileListPath = __dirname + "/public/.gitignore/users/" + dir + "/ucloud_files.txt";

  let data = [];

  if (fs.existsSync(fileListPath)) {
    let filesArray = fs.readFileSync(fileListPath, "utf-8");
    filesArray = filesArray.split("\r\n");
    
    filesArray.forEach((file) => {
      let fileType = "";
      let fileComponents = file.split(".");
      if (fileComponents.length > 1)
        fileType = fileComponents[fileComponents.length - 1];
  
      let linkPath = "/" + file;
  
      data.push({ name: file, linkUrl: linkPath, type: fileType });
    });
  }


  let greeterText = fs.readFileSync(__dirname + `/public/.gitignore/users/${req.session.username}/.${req.session.username}/ucloud_greeter.txt`, { encoding: 'utf-8' });
  let avatarPath = '../images_website/avatar.png';
   if (fs.existsSync(__dirname + `/public/.gitignore/users/${req.session.username}/.${req.session.username}/${req.session.username}_avatar.png`)) {
    avatarPath = `../.gitignore/users/${req.session.username}/.${req.session.username}/${req.session.username}_avatar.png`;
   }

  let responseOBJ = {
    greeter: greeterText,
    avatarPath: avatarPath,
    data: data
  };
  res.send(responseOBJ);
  res.end();
});

let avatarRouter = express.Router();
avatarRouter.use(bodyParser.urlencoded({ extended: true }));
avatarRouter.route('/').post((req, res, next)=>{
  let form = formidable({ multiples: true });
  form.parse(req, (err, fields, files)=>{
    if (err) console.log(err);

    console.log(path.extname(files.avatarImg.originalFilename));

    if (path.extname(files.avatarImg.originalFilename) !== '.jpg' && path.extname(files.avatarImg.originalFilename) !== '.png' && path.extname(files.avatarImg.originalFilename) !== '.gif' && path.extname(files.avatarImg.originalFilename) !== '.webp') {
      res.send(`Profile pic must be one of the following file types: jpeg, png, gif, webp. <a href='https://ucloudproject.com/homePage/homePage.html?pwd=${req.session.username}'>Back to site</a>`);
      return next();
    }

    fs.rename(files.avatarImg.filepath, __dirname + `/public/.gitignore/users/${req.session.username}/.${req.session.username}/${req.session.username}_avatar.png`, err=>{
      if (err) console.log(err);

      res.send(`Profile pic changed. <a href='https://ucloudproject.com/homePage/homePage.html?pwd=${req.session.username}'>Back to site</a>`);
      res.end();
    });
  });
});

let uploadRouter = express.Router();
uploadRouter.use(bodyParser.urlencoded({ extended: true }));
uploadRouter.route("/").post((req, res, next) => {
  let form = formidable({ multiples: true });
  form.parse(req, (err, fields, files) => {
    if (err) console.log(err);

    let dir = fields.filePath;

    let ownerofDir = dir.split("/")[0];
    if (ownerofDir !== req.session.username) {
      res.send(
        `Error: User lacking permission to edit. <a href='https://ucloudproject.com/homePage/homePage.html?pwd=${fields.filePath}'>Back to site</a>`
      );
      return next();
    }

    let fileListPath = __dirname + "/public/.gitignore/users/" + dir + "/ucloud_files.txt";

    if (fields.file_name) {
      let type = "";

      let wantedExtensionsArray = fields.file_name.split(".");
      if (wantedExtensionsArray.length === 1) {
        let fileExtensionsArray = files.userFile.originalFilename.split(".");
        type = "." + fileExtensionsArray[fileExtensionsArray.length - 1];
      }

      files.userFile.originalFilename = fields.file_name + type;
    }

    let oldPath = files.userFile.filepath;
    let newPath =
      __dirname +
      "/public/.gitignore/users/" +
      dir +
      "/" +
      files.userFile.originalFilename;
    let name = dir + "/" + files.userFile.originalFilename;

    if (files.userFile.originalFilename.toLowerCase() === "ucloud_files.txt") {
      res.send(
        `File cannot be named: <i>${files.userFile.originalFilename.toLowerCase()}</i>! Please try a different name: <a href='https://ucloudproject.com/homePage/homePage.html?pwd=${
          fields.filePath
        }'>Back to site</a>`
      );
      return next();
    }

    if (path.extname(files.userFile.originalFilename) === ".backlink") {
      res.send(
        `File cannot have extension: <i>.backlink</i>! Please try a different extension: <a href='https://ucloudproject.com/homePage/homePage.html?pwd=${fields.filePath}'>Back to site</a>`
      );
      return next();
    } else if (path.extname(files.userFile.originalFilename) === ".") {
      res.send(
        `File name cannot end on a dot! Please try a different extension: <a href='https://ucloudproject.com/homePage/homePage.html?pwd=${fields.filePath}'>Back to site</a>`
      );
      return next();
    }

    if (fs.existsSync(fileListPath)) {
      let allFilesArray = fs.readFileSync(fileListPath, "utf-8").split("\r\n");
      for (let item in allFilesArray) {
        if (allFilesArray[item] === name) {
          res.send(
            `File already exists! <a href='https://ucloudproject.com/homePage/homePage.html?pwd=${fields.filePath}'>Back to site</a>`
          );
          return next();
        }
      }
    }

    if (fs.existsSync(fileListPath))
      fs.writeFileSync(fileListPath, `\r\n` + name, {
        encoding: "utf-8",
        flag: "a",
      });
    else fs.writeFileSync(fileListPath, name, { encoding: "utf-8", flag: "w" });

    fs.rename(oldPath, newPath, (err) => {
      if (err) console.log(err);
      res.send(
        `File upload was successful. <a href="https://ucloudproject.com/homePage/homePage.html?pwd=${fields.filePath}">Back to site</a>`
      );
    });
  });
});

let mkdirRouter = express.Router();
mkdirRouter.use(bodyParser.urlencoded({ extended: true }));
mkdirRouter.route("/").post((req, res, next) => {
  let dir = req.body.path;
  let fileListPath = __dirname + "/public/.gitignore/users/" + dir + "/ucloud_files.txt";
  
  let removeCurrentDir = dir.split("/").pop();

  let ownerofDir = dir.split("/")[0];
  if (ownerofDir !== req.session.username) {
    res.send(
      `Error: User lacking permission to edit. <a href='https://ucloudproject.com/homePage/homePage.html?pwd=${dir}'>Back to site</a>`
    );
    return next();
  }

  let name = req.body.folderName;

  if (fs.existsSync(fileListPath)) {
    let allFilesArray = fs.readFileSync(fileListPath, "utf-8").split("\r\n");
    for (let item in allFilesArray) {
      if (allFilesArray[item] === dir + "/" + name) {
        res.send(
          `Folder already exists! <a href='https://ucloudproject.com/homePage/homePage.html?pwd=${req.body.path}'>Back to site</a>`
        );
        return next();
      }
    }
  }

  fs.mkdir(__dirname + "/public/.gitignore/users/" + dir + "/" + name, (err) => {
    if (err) console.log(err);

    fs.writeFileSync(
      __dirname + "/public/.gitignore/users/" + dir + "/" + name + "/ucloud_files.txt",
      "back.backlink",
      { encoding: "utf-8", flag: "w" }
    );

    if (fs.existsSync(fileListPath))
      fs.writeFileSync(fileListPath, "\r\n" + dir + "/" + name, {
        encoding: "utf-8",
        flag: "a",
      });
    else
      fs.writeFileSync(fileListPath, dir + "/" + name, {
        encoding: "utf-8",
        flag: "w",
      });
    res.redirect(`https://ucloudproject.com/homePage/homePage.html?pwd=${dir}`);
  });
});

let searchRouter = express.Router();
searchRouter.use(bodyParser.urlencoded({ extended: true }));
searchRouter.route("/:searchOBJ").get((req, res) => {
  let searchOBJ = JSON.parse(req.params["searchOBJ"]);
  let query = new RegExp(`${searchOBJ.search_query}`, "i");

  let searchData = [];
  find.file(
    query,
    __dirname + "/public/.gitignore/users/" + searchOBJ.path,
    function (searchResults) {
      searchResults.forEach((file) => {
        if (
          path.basename(file) === "ucloud_greeter.txt" ||
          path.basename(file) === `${searchOBJ.path.split('/')[0]}_avatar.png`
        ) return;

        let fileComponents = path.basename(file).split(".");
        let type = fileComponents[fileComponents.length - 1];

        let filePath = path
          .relative(__dirname + "/public/.gitignore/users/" + searchOBJ.path, file)
          .split("\\")
          .join("/");

        searchData.push({
          name: path.basename(file),
          linkUrl: '/' + searchOBJ.path + '/' + filePath,
          type: type,
        });

      });

      find.dir(query, __dirname + "/public/.gitignore/users/" + searchOBJ.path, function (searchResults) {
        searchResults.forEach((file) => {

          if (path.basename(file) === `.${(searchOBJ.path.split('/')[0])}`) return;

          let type = undefined;

          let filePath = path
            .relative(__dirname + "/public/.gitignore/users/" + searchOBJ.path, file)
            .split("\\")
            .join("/");

          searchData.push({ name: filePath, linkUrl: filePath, type: type });
        });
        res.send(searchData);
      });
    }
  );
});

let searchUsersRouter = express.Router();
searchUsersRouter.use(bodyParser.urlencoded({ extended: true }));
searchUsersRouter.route("/:search_query").get((req, res) => {
  let search_query = req.params["search_query"];

  client.connect((err) => {
    if (err) console.log(err);

    let usersCollection = client.db("ucloud").collection("users");
    usersCollection.find({ username: search_query }).toArray((err, results) => {
      if (err) console.log(err);

      if (results[0]) {
        results.forEach(user => {
          if (fs.existsSync(__dirname + `/public/.gitignore/users/${user.username}/.${user.username}/${user.username}_avatar.png`)) user.avatarLink = `../.gitignore/users/${user.username}/.${user.username}/${user.username}_avatar.png`;
          else user.avatarLink = '../images_website/avatar.png';
        });
      }

      res.send(results);
      client.close();
    });
  });
});

let renameRouter = express.Router();
renameRouter.use(bodyParser.json());
renameRouter.use(bodyParser.urlencoded({ extended: true }));
renameRouter.route("/:renameOBJ").put((req, res, next) => {
  let dir = req.body.path;
  
  let prevDir = dir.split("/");
  let removeCurrentDir = prevDir.pop();
  let removeRoot = prevDir.splice(0, 1);
  prevDir = prevDir.join("/");
  
  let ownerofDir = dir.split("/")[1];
  if (ownerofDir !== req.session.username) {
    res.send(
      `Error: User lacking permission to edit. <a href='https://ucloudproject.com/homePage/homePage.html?pwd=${prevDir}'>Back to site</a>`
    );
    return next();
  }

  let prevDirAbs = prevDir;
  if (prevDir[0] != "/") prevDirAbs = "/" + prevDir;

  let fileListPath =
    __dirname + "/public/.gitignore/users" + prevDirAbs + "/ucloud_files.txt";

  let queryOBJ = JSON.parse(req.params["renameOBJ"]);
  if (queryOBJ.extension) queryOBJ.extension = "." + queryOBJ.extension;
  if (queryOBJ.type == "file") queryOBJ.newFileName += queryOBJ.extension;

  let allFilesArray = fs.readFileSync(fileListPath, "utf-8").split("\r\n");

  let dirAbs = dir;
  if (dir[0] != "/") dirAbs = "/" + dir;
  fs.rename(
    __dirname + "/public/.gitignore/users" + dirAbs,
    __dirname + "/public/.gitignore/users" + prevDirAbs + "/" + queryOBJ.newFileName,
    (err) => {
      if (err) console.log(err);
    }
  );

  for (let item in allFilesArray) {
    if (path.basename(allFilesArray[item]) == queryOBJ.query) {
      let removed = allFilesArray.splice(
        item,
        1,
        prevDir + "/" + queryOBJ.newFileName
      );
    }
  }

  if (allFilesArray.length > 0) {
    for (let fileName in allFilesArray) {
      if (fileName == "0") {
        fs.writeFileSync(fileListPath, allFilesArray[fileName], {
          encoding: "utf-8",
        });
      } else {
        fs.writeFileSync(fileListPath, "\r\n" + allFilesArray[fileName], {
          encoding: "utf-8",
          flag: "a",
        });
      }
    }
  } else {
    fs.rm(fileListPath, (err) => {
      if (err) console.log(err);
    });
  }
  res.send(`File renamed successfully`);
});

let deleteRouter = express.Router();
deleteRouter.use(bodyParser.json());
deleteRouter.use(bodyParser.urlencoded({ extended: true }));
deleteRouter.route("/:deleteOBJ").delete((req, res, next) => {
  let queryOBJ = JSON.parse(req.params["deleteOBJ"]);

  let dir = req.body.path;
  let prevDir = dir.split("/");
  let removeCurrentDir = prevDir.pop();
  prevDir = prevDir.join("/");

  let ownerofDir = dir.split("/")[1];
  if (ownerofDir !== req.session.username) {
    res.send(
      `Error: User lacking permission to edit. <a href='https://ucloudproject.com/homePage/homePage.html?pwd=${prevDir}'>Back to site</a>`
    );
    return next();
  }

  if (prevDir[0] != "/") prevDir = "/" + prevDir;
  let fileListPath =
    __dirname + "/public/.gitignore/users" + prevDir + "/ucloud_files.txt";

  let allFilesArray = fs.readFileSync(fileListPath, "utf-8").split("\r\n");

  if (dir[0] != "/") dir = "/" + dir;
  fs.rm(__dirname + "/public/.gitignore/users" + dir, { recursive: true }, (err) => {
    if (err) console.log(err);
  });

  for (let item in allFilesArray) {
    if (path.basename(allFilesArray[item]) == queryOBJ.query) {
      let removed = allFilesArray.splice(item, 1);
    }
  }

  if (allFilesArray.length > 0) {
    for (let fileName in allFilesArray) {
      if (fileName == "0") {
        fs.writeFileSync(fileListPath, allFilesArray[fileName], {
          encoding: "utf-8",
        });
      } else {
        fs.writeFileSync(fileListPath, "\r\n" + allFilesArray[fileName], {
          encoding: "utf-8",
          flag: "a",
        });
      }
    }
  } else {
    fs.rm(fileListPath, (err) => {
      if (err) console.log(err);
    });
  }
  res.send(`File: '${queryOBJ.query}' deleted successfully`);
});

// --- Server ---
console.clear();
// let backendPort = 3000;
// for (let i = 0; i < process.argv.length; i++) {
//   if (process.argv[i] == "-p") {
//     try {
//       backendPort = process.argv[i + 1];
//       if (backendPort == undefined) {
//         backendPort = 3000;
//         console.log("Port was not defined. Defaulting to port 3000\n".red);
//       }

//       let prevPort = fs.readFileSync(__dirname + "/port.txt", {
//         encoding: "utf-8",
//       });

//       let changePort = replace.sync({
//         files: __dirname + "/public/index.*",
//         from: `const port = ${prevPort}`,
//         to: `const port = ${backendPort}`,
//       });
//       console.log(changePort);

//       fs.writeFileSync(__dirname + "/port.txt", backendPort, {
//         encoding: "utf-8",
//         flag: "w",
//       });
//       console.clear();
//     } catch (e) {
//       console.log(e);
//     }
//   }
// }

let sslCredentials = {
  key: fs.readFileSync("/etc/letsencrypt/live/www.ucloudproject.com/privkey.pem"),
  cert: fs.readFileSync("/etc/letsencrypt/live/www.ucloudproject.com/fullchain.pem"),
};

// let backend = express()
// https.createServer(sslCredentials, backend).listen(backendPort);

let frontend = express()
.use(cookieSession({
  keys: ['_0dedeae2e90cb813022508fa213e9c53']
}))
.use(cors({
  origin: true,
  methods: ['GET', 'PUT', 'POST', 'DELETE'],
  credentials: true,
  preflightContinue: true
}))
.use(express.static(__dirname + "/public"))
.use("/verify", verifyRouter)
.use("/signup", signupRouter)
.use("/login", loginRouter)
.use('/userExists', userExistsRouter)
.use("/home", homeRouter)
.use('/avatar', avatarRouter)
.use("/upload", uploadRouter)
.use("/mkdir", mkdirRouter)
.use("/search", searchRouter)
.use("/search_users", searchUsersRouter)
.use("/rename", renameRouter)
.use("/delete", deleteRouter);

http
  .createServer((req, res) => {
    res.writeHead(301, { Location: "https://ucloudproject.com" });
    res.end();
  })
  .listen(80);

https.createServer(sslCredentials, frontend).listen(443);

console.log(`Frontend listening on ports 80 and 443 ✔`.green);
// console.log(`Backend listening on port ${backendPort} ☁\n`.blue);
console.log(`Website: https://ucloudproject.com ⭐\n\n`.yellow);
console.log("-------------------------------\n");

open("https://ucloudproject.com");
