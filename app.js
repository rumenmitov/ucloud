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
  open = require("open");

// Server config
require('dotenv').config();
let LINK = 'ucloudproject.com'

// Nodemailer Config
const auth = {
  user: process.env.NODEMAILER_USER,
  pass: process.env.NODEMAILER_PASS,
};

let mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: auth,
});

// MongoDB Config
const AtlasUrl = process.env.ATLAS_URL;
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
      html: `<a href='https://${LINK}/signup/signup.html?userCode=${encodedEmail}'>Verify</a>`,
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
      `Invlid email. Please try with a valid email address: <a href='https://${LINK}/verification/verification.html'>Click here to verify</a>`
    );
    return next();
  }

  if (req.body.password !== req.body.password_confirm) {
    res.send(
      `Passwords do not match! <a href='https://${LINK}/signup/signup.html?userCode=${Buffer.from(req.body.email).toString('base64')}'>Try again!</a>`
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
                __dirname + "/public/users/" + req.body.username,
                (err) => {
                  if (err) console.log(err);

                  fs.mkdir(
                    __dirname +
                      "/public/users/" +
                      req.body.username +
                      "/." +
                      req.body.username,
                    (err) => {
                      if (err) console.log(err);

                      fs.writeFileSync(
                        __dirname +
                          "/public/users/" +
                          req.body.username +
                          "/." +
                          req.body.username +
                          "/ucloud_greeter.txt",
                        `Hello ` + req.body.firstName,
                        { encoding: "utf-8", flag: "w" }
                      );

                      req.session.username = req.body.username;
                      res.redirect(
                        `https://${LINK}/homePage/homePage.html?pwd=${req.body.username}`
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

let isUserLoggedInRouter = express.Router();
isUserLoggedInRouter.route('/').all((req, res)=>{
    if (req.session.username) res.send(req.session.username);
    else res.send(null);
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
            `Username and password do not match. <a href="https://${LINK}/login/login.html">Try again</a>`
          );
          client.close();
          return next();
        } else {
          if (results[0].password == req.body.password) {
            req.session.username = results[0].username;
            res.redirect(
              `https://${LINK}/homePage/homePage.html?pwd=${results[0].username}`
            );
          } else {
            res.send(
              `Username and password do not match. <a href="https://${LINK}/login/login.html">Try again</a>`
            );
          }

          client.close();
          return next();
        }
      });
  });
});

let logoutRouter = express.Router();
logoutRouter.route('/').all((req, res)=>{
	req.session = null;
	res.send(null);
});

let passResetRouter = express.Router();
passResetRouter.use(bodyParser.json());
passResetRouter.use(bodyParser.urlencoded({ extended: true }));
passResetRouter.route('/:userCode').post((req, res, next)=>{
  let userCode = req.params['userCode'];

  if (userCode == 0) {

    client.connect(err => {
      if (err) console.log(err);

      let usersCollection = client.db('ucloud').collection('users');
      usersCollection.find({ $or: [ { username: req.body.username  }, { email: req.body.username  }  ]  }).toArray((err, results)=>{
	if (err) console.log(err);
	  
	  if (!results[0]) res.send('User does not exist! Make sure that you typed your username / email correctly.');
	  else {
	    let userId = results[0]._id.toString();
	    let userId_encoded = Buffer.from(userId).toString('base64');
	    mailTransporter.sendMail({
	      from: auth.user,
	      to: results[0].email,
	      subject: "UCloud Password Reset",
	      html: `<a href='https://${LINK}/password_reset/new_password.html?userCode=${userId_encoded}'>Change Password</a>`,
	  },
	  (err) => {
	    if (err) console.log(err);

	    res.send("Password reset email sent. Check your inbox.");
	  });
	}
	client.close();
      });
    });
  } else {
    if (req.body.newPassword !== req.body.confirmPassword) res.send('Passwords do not match! Please try again!');
    else {
      client.connect(err =>{
	if (err) console.log(err);

	let userId = new mongodb.ObjectID(req.body.userId); 
	let usersCollection = client.db('ucloud').collection('users');
	// NOTE: First check if user has not been deleted
	usersCollection.find({ _id: userId  }).toArray((err, results)=>{
	  if (err) console.log(err);
	    
	  if (!results[0]) {
	    res.send('This user does not exist. Please try making an account!');
	    client.close();
	  } else {
	    usersCollection.updateOne( { _id: userId  }, { $set: { password: req.body.newPassword,  password_confirm: req.body.confirmPassword  } }, 
	      (err, results)=> {
		if (err) console.log(err);
		
		res.send('Password reset successfully!');
		client.close();
	      });
	  }
	});
      });
    }
  }
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
      folderSize(__dirname + `/public/users/${req.body.user}`, (err, bytes)=>{
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
  let fileListPath = __dirname + "/public/users/" + dir + "/ucloud_files.txt";

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

  let greeterText = 'You are a GUEST';
  if (fs.existsSync(__dirname + `/public/users/${req.session.username}/.${req.session.username}/ucloud_greeter.txt`, { encoding: 'utf-8' })) {
    greeterText = fs.readFileSync(__dirname + `/public/users/${req.session.username}/.${req.session.username}/ucloud_greeter.txt`, { encoding: 'utf-8' });
  }

  let uniqueTimeStamp = new Date().getTime();
  let avatarPath = '../images_website/avatar.png';
   if (fs.existsSync(__dirname + `/public/users/${req.session.username}/.${req.session.username}/${req.session.username}_avatar.png`)) {
    avatarPath = `../users/${req.session.username}/.${req.session.username}/${req.session.username}_avatar.png?${uniqueTimeStamp}`;
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

    if (path.extname(files.avatarImg.originalFilename) !== '.jpg' && path.extname(files.avatarImg.originalFilename) !== '.png' && path.extname(files.avatarImg.originalFilename) !== '.gif' && path.extname(files.avatarImg.originalFilename) !== '.webp') {
      res.send(`Profile pic must be one of the following file types: jpeg, png, gif, webp. <a href='https://${LINK}/homePage/homePage.html?pwd=${req.session.username}'>Back to site</a>`);
      return next();
    }

    fs.rename(files.avatarImg.filepath, __dirname + `/public/users/${req.session.username}/.${req.session.username}/${req.session.username}_avatar.png`, err=>{
      if (err) console.log(err);

      res.send(`Profile pic changed. <a href='https://${LINK}/homePage/homePage.html?pwd=${req.session.username}'>Back to site</a>`);
      res.end();
    });
  });
});

let greeterRouter = express.Router();
greeterRouter.use(bodyParser.urlencoded({ extended: true }));
greeterRouter.route('/').post((req, res, next)=>{
  fs.writeFileSync(__dirname + `/public/users/${req.session.username}/.${req.session.username}/ucloud_greeter.txt`, req.body.newGreeter, {encoding:'utf8', flag:'w'});
  res.send(`Greeter changed successfully! <a href='https://${LINK}/homePage/homePage.html?pwd=${req.session.username}'>Back to site</a>`);
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
        `Error: User lacking permission to edit. <a href='https://${LINK}/homePage/homePage.html?pwd=${fields.filePath}'>Back to site</a>`
      );
      return next();
    }

    let fileListPath = __dirname + "/public/users/" + dir + "/ucloud_files.txt";
    if (fields.file_name && files.userFile.length === 1) {
      let type = "";

      let wantedExtensionsArray = fields.file_name.split(".");
      if (wantedExtensionsArray.length === 1) {
        let fileExtensionsArray = files.userFile.originalFilename.split(".");
        type = "." + fileExtensionsArray[fileExtensionsArray.length - 1];
      }

      files.userFile.originalFilename = fields.file_name + type;
    }

    if (Array.isArray(files.userFile)) {
      for ( let i = 0; i < files.userFile.length; i++ ) {
	let oldPath = files.userFile[i].filepath;
	let newPath =
	  __dirname +
	  "/public/users/" +
	  dir +
	  "/" +
	  files.userFile[i].originalFilename;
	let name = dir + "/" + files.userFile[i].originalFilename;

	if (files.userFile[i].originalFilename.toLowerCase() === "ucloud_files.txt") {
	  res.send(
	    `File cannot be named: <i>${files.userFile[i].originalFilename.toLowerCase()}</i>! Please try a different name: <a href='https://${LINK}/homePage/homePage.html?pwd=${
	      fields.filePath
	    }'>Back to site</a>`
	  );
	  return next();
	}

	if (path.extname(files.userFile[i].originalFilename) === ".backlink") {
	  res.send(
	    `File cannot have extension: <i>.backlink</i>! Please try a different extension: <a href='https://${LINK}/homePage/homePage.html?pwd=${fields.filePath}'>Back to site</a>`
	  );
	  return next();
	} else if (path.extname(files.userFile[i].originalFilename) === ".") {
	  res.send(
	    `File name cannot end on a dot! Please try a different extension: <a href='https://${LINK}/homePage/homePage.html?pwd=${fields.filePath}'>Back to site</a>`
	  );
	  return next();
	}

	if (fs.existsSync(fileListPath)) {
	  let allFilesArray = fs.readFileSync(fileListPath, "utf-8").split("\r\n");
	  for (let item in allFilesArray) {
	    if (allFilesArray[item] === name) {
	      res.send(
		`File already exists! <a href='https://${LINK}/homePage/homePage.html?pwd=${fields.filePath}'>Back to site</a>`
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
	});
     
      }
    } else {
	let oldPath = files.userFile.filepath;
	let newPath =
	  __dirname +
	  "/public/users/" +
	  dir +
	  "/" +
	  files.userFile.originalFilename;
	let name = dir + "/" + files.userFile.originalFilename;

	if (files.userFile.originalFilename.toLowerCase() === "ucloud_files.txt") {
	  res.send(
	    `File cannot be named: <i>${files.userFile.originalFilename.toLowerCase()}</i>! Please try a different name: <a href='https://${LINK}/homePage/homePage.html?pwd=${
	      fields.filePath
	    }'>Back to site</a>`
	  );
	  return next();
	}

	if (path.extname(files.userFile.originalFilename) === ".backlink") {
	  res.send(
	    `File cannot have extension: <i>.backlink</i>! Please try a different extension: <a href='https://${LINK}/homePage/homePage.html?pwd=${fields.filePath}'>Back to site</a>`
	  );
	  return next();
	} else if (path.extname(files.userFile.originalFilename) === ".") {
	  res.send(
	    `File name cannot end on a dot! Please try a different extension: <a href='https://${LINK}/homePage/homePage.html?pwd=${fields.filePath}'>Back to site</a>`
	  );
	  return next();
	}

	if (fs.existsSync(fileListPath)) {
	  let allFilesArray = fs.readFileSync(fileListPath, "utf-8").split("\r\n");
	  for (let item in allFilesArray) {
	    if (allFilesArray[item] === name) {
	      res.send(
		`File already exists! <a href='https://${LINK}/homePage/homePage.html?pwd=${fields.filePath}'>Back to site</a>`
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
	});
    }
    res.send(
      `File upload was successful. <a href="https://${LINK}/homePage/homePage.html?pwd=${fields.filePath}">Back to site</a>`
    );

 });
});

let mkdirRouter = express.Router();
mkdirRouter.use(bodyParser.urlencoded({ extended: true }));
mkdirRouter.route("/").post((req, res, next) => {
  let dir = req.body.path;
  let fileListPath = __dirname + "/public/users/" + dir + "/ucloud_files.txt";
  
  let removeCurrentDir = dir.split("/").pop();

  let ownerofDir = dir.split("/")[0];
  if (ownerofDir !== req.session.username) {
    res.send(
      `Error: User lacking permission to edit. <a href='https://${LINK}/homePage/homePage.html?pwd=${dir}'>Back to site</a>`
    );
    return next();
  }

  let name = req.body.folderName;

  if (fs.existsSync(fileListPath)) {
    let allFilesArray = fs.readFileSync(fileListPath, "utf-8").split("\r\n");
    for (let item in allFilesArray) {
      if (allFilesArray[item] === dir + "/" + name) {
        res.send(
          `Folder already exists! <a href='https://${LINK}/homePage/homePage.html?pwd=${req.body.path}'>Back to site</a>`
        );
        return next();
      }
    }
  }

  fs.mkdir(__dirname + "/public/users/" + dir + "/" + name, (err) => {
    if (err) console.log(err);

    fs.writeFileSync(
      __dirname + "/public/users/" + dir + "/" + name + "/ucloud_files.txt",
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
    res.redirect(`https://${LINK}/homePage/homePage.html?pwd=${dir}`);
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
    __dirname + "/public/users/" + searchOBJ.path,
    function (searchResults) {
      searchResults.forEach((file) => {
        if (
          path.basename(file) === "ucloud_greeter.txt" ||
          path.basename(file) === `${searchOBJ.path.split('/')[0]}_avatar.png`
        ) return;

        let fileComponents = path.basename(file).split(".");
        let type = fileComponents[fileComponents.length - 1];

        let filePath = path
          .relative(__dirname + "/public/users/" + searchOBJ.path, file)
          .split("\\")
          .join("/");

        searchData.push({
          name: path.basename(file),
          linkUrl: '/' + searchOBJ.path + '/' + filePath,
          type: type,
        });

      });

      find.dir(query, __dirname + "/public/users/" + searchOBJ.path, function (searchResults) {
        searchResults.forEach((file) => {

          if (path.basename(file) === `.${(searchOBJ.path.split('/')[0])}`) return;

          let type = undefined;

          let filePath = path
            .relative(__dirname + "/public/users/" + searchOBJ.path, file)
            .split("\\")
            .join("/");

	  let fileName = searchOBJ.path + '/' + filePath;

          searchData.push({ name: fileName, linkUrl: filePath, type: type });
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
          if (fs.existsSync(__dirname + `/public/users/${user.username}/.${user.username}/${user.username}_avatar.png`)) user.avatarLink = `../users/${user.username}/.${user.username}/${user.username}_avatar.png`;
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
      `Error: User lacking permission to edit. <a href='https://${LINK}/homePage/homePage.html?pwd=${prevDir}'>Back to site</a>`
    );
    return next();
  }

  let prevDirAbs = prevDir;
  if (prevDir[0] != "/") prevDirAbs = "/" + prevDir;

  let fileListPath =
    __dirname + "/public/users" + prevDirAbs + "/ucloud_files.txt";

  let queryOBJ = JSON.parse(req.params["renameOBJ"]);
  if (queryOBJ.extension) queryOBJ.extension = "." + queryOBJ.extension;
  if (queryOBJ.type == "file") queryOBJ.newFileName += queryOBJ.extension;

  let allFilesArray = fs.readFileSync(fileListPath, "utf-8").split("\r\n");

  let dirAbs = dir;
  if (dir[0] != "/") dirAbs = "/" + dir;
  fs.rename(
    __dirname + "/public/users" + dirAbs,
    __dirname + "/public/users" + prevDirAbs + "/" + queryOBJ.newFileName,
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
      `Error: User lacking permission to edit. <a href='https://${LINK}/homePage/homePage.html?pwd=${prevDir}'>Back to site</a>`
    );
    return next();
  }

  if (prevDir[0] != "/") prevDir = "/" + prevDir;
  let fileListPath =
    __dirname + "/public/users" + prevDir + "/ucloud_files.txt";

  let allFilesArray = fs.readFileSync(fileListPath, "utf-8").split("\r\n");

  if (dir[0] != "/") dir = "/" + dir;
  fs.rm(__dirname + "/public/users" + dir, { recursive: true }, (err) => {
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

let sslCredentials = {
  key: fs.readFileSync(__dirname + '/sslCertificate/key.pem'),
  cert: fs.readFileSync(__dirname + "/sslCertificate/cert.pem"),
};

let PUBLIC_DIR = __dirname + '/public';

if (process.argv[2] === 'dev') {
  LINK = 'localhost'
  PUBLIC_DIR = __dirname + '/dev/public';
}

let serverBackend = express()
.use(cookieSession({
  keys: [ process.env.COOKIE_KEY ]
}))
.use(cors({
  origin: true,
  methods: ['GET', 'PUT', 'POST', 'DELETE'],
  credentials: true,
  preflightContinue: true
}))
.use(express.static(PUBLIC_DIR))
.use("/verify", verifyRouter)
.use("/signup", signupRouter)
.use('/checkLogin', isUserLoggedInRouter)
.use("/login", loginRouter)
.use('/logout', logoutRouter)
.use('/passReset', passResetRouter)
.use('/userExists', userExistsRouter)
.use("/home", homeRouter)
.use('/avatar', avatarRouter)
.use('/changeGreeter', newGreeter)
.use("/upload", uploadRouter)
.use("/mkdir", mkdirRouter)
.use("/search", searchRouter)
.use("/search_users", searchUsersRouter)
.use("/rename", renameRouter)
.use("/delete", deleteRouter);

http
  .createServer((req, res) => {
    res.writeHead(301, { Location: `https://${LINK}` });
    res.end();
  })
  .listen(80);

https.createServer(sslCredentials, serverBackend).listen(443);
console.log(`Server listening on ports 80 and 443 ✔\n`.green);
console.log(`Website: https://${LINK} ⭐\n\n`.yellow);
console.log("-------------------------------\n");

// open("https://ucloudproject.com");
