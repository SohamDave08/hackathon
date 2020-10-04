const express = require("express");
const app = express();
const path = require("path");
const router = express.Router();
var session = require("express-session");
var nodemailer = require("nodemailer");
const driver = require("bigchaindb-driver");
var crypto = require("crypto");
var MongoClient = require("mongodb").MongoClient;
var url = "mongodb://localhost:27017/";
const ipfsAPI = require("ipfs-api");
const fs = require("fs");
var http = require("http");
var formidable = require("formidable");
const API_PATH = "http://localhost:9984/api/v1/";
const API_PATH1 = "https://test.ipdb.io//api/v1/";
const ipfs = ipfsAPI("ipfs.infura.io", "5001", { protocol: "https" });
const bdb = require("easy-bigchain");
const conn = new driver.Connection(API_PATH);
const conn1 = new driver.Connection(API_PATH1);

var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "blockvotes@gmail.com",
    pass: "bvotes@123",
  },
});

function encrypt(text) {
  var cipher = crypto.createCipher("aes-256-cbc", "d6F3Efeq");
  var crypted = cipher.update(text, "utf8", "hex");
  crypted += cipher.final("hex");
  return crypted;
}

function decrypt(text) {
  var decipher = crypto.createDecipher("aes-256-cbc", "d6F3Efeq");
  var dec = decipher.update(text, "hex", "utf8");
  dec += decipher.final("utf8");
  return dec;
}

var bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({ secret: "ssshhhhh", resave: false, saveUninitialized: true })
);

function generateOTP() {
  // Declare a digits variable
  // which stores all digits
  var digits = "0123456789";
  let OTP = "";
  for (let i = 0; i < 4; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
}

async function getAsset(data, publicKey, privateKey, meta) {
  var asset = await conn.searchAssets(data);
  asset.forEach((item) => console.log(item.id));
  var transaction = await conn.listTransactions(asset[0].id);
  console.log(transaction.length);

  console.log(transaction[transaction.length - 1].metadata);
  metadata = transaction[transaction.length - 1].metadata;
  metadata["doclist"].push(meta);
  metdata = JSON.stringify(metadata);
  console.log("metadata is b", metadata);

  const txTransferBob = driver.Transaction.makeTransferTransaction(
    [{ tx: transaction[transaction.length - 1], output_index: 0 }],
    [
      driver.Transaction.makeOutput(
        driver.Transaction.makeEd25519Condition(publicKey)
      ),
    ],
    metadata
  );

  let txTransferBobSigned = driver.Transaction.signTransaction(
    txTransferBob,
    privateKey
  );

  transfer = await conn.postTransactionCommit(txTransferBobSigned);
  transfer = await conn1.postTransactionCommit(txTransferBobSigned);
  console.log(transfer.id);
}

async function revokeAsset(data, publicKey, privateKey, meta) {
  var asset = await conn.searchAssets(data);
  asset.forEach((item) => console.log(item.id));
  var transaction = await conn.listTransactions(asset[0].id);
  console.log(transaction.length);

  console.log(transaction[transaction.length - 1].metadata);
  metadata = transaction[transaction.length - 1].metadata;
  metadata["doclist"].pop(meta);
  metadata["revokelist"].push(meta);
  metdata = JSON.stringify(metadata);
  console.log("metadata is b", metadata);

  const txTransferBob = driver.Transaction.makeTransferTransaction(
    [{ tx: transaction[transaction.length - 1], output_index: 0 }],
    [
      driver.Transaction.makeOutput(
        driver.Transaction.makeEd25519Condition(publicKey)
      ),
    ],
    metadata
  );
  // Sign with alice's private key
  let txTransferBobSigned = driver.Transaction.signTransaction(
    txTransferBob,
    privateKey
  );

  // Post with commit so transaction is validated and included in a block
  transfer = await conn.postTransactionCommit(txTransferBobSigned);
  transfer = await conn1.postTransactionCommit(txTransferBobSigned);
  console.log(transfer.id);
}
function upd(bu) {
  MongoClient.connect(url, function (err, db) {
    if (err) {
      throw err;
    } else {
      var dbo = db.db("bigchain");

      dbo
        .collection("metadata")
        .findOneAndUpdate(
          { "metadata.id": bu },
          { $set: { "metadata.doclist": "0" } },
          { upsert: true, returnNewDocument: true, sort: { _id: -1 } },
          function (err, doc) {
            if (err) {
              throw err;
            } else {
              console.log("Updated");
            }
          }
        );
    }
  });
}

app.use(
  express.static(path.join("/home/ansh/Downloads/SecureHealth-master/images"))
);
app.use(
  express.static(
    path.join(
      "/home/ansh/Downloads/SecureHealth-master/simple-pre-loader-20200402T153112Z-001"
    )
  )
);
app.set("view engine", "ejs");
//start of main
app.get("/", function (req, res) {
  res.sendFile(
    "/home/ansh/Downloads/SecureHealth-master/home-20200414T045206Z-001/home/SampleScroll.html"
  );
});
//end of main

//doctor start
app.get("/doctor", function (req, res) {
  res.sendFile(
    path.join(
      "/home/ansh/Downloads/SecureHealth-master/signin-signup/docsignfinal.html"
    )
  );
});
// doc end

//patient start
app.get("/paitent", function (req, res) {
  res.sendFile(
    path.join(
      "/home/ansh/Downloads/SecureHealth-master/signin-signup/patientsignfinal.html"
    )
  );
});
//patient end

//psignup start
app.post("/psignup", function (req, res) {
  req.session.fname = req.body.fname;
  req.session.lname = req.body.lname;
  req.session.email = req.body.email;
  req.session.pass = req.body.pass;
  req.session.dob = req.body.dob;
  req.session.gen = req.body.gen;
  req.session.phone = req.body.phone;
  req.session.emgemail = req.body.emgemail;
  var emailtext = generateOTP();
  console.log(emailtext);
  req.session.otp = emailtext;
  
  const accountSid = "ACd9c13445898ed1dd3eab89f9d4fb99ac";
  const authToken = "3d38700c9f75f060cadc5b075f5da980";
  const client = require("twilio")(accountSid, authToken);

  async function sms() {
    const message = await client.messages.create({
      to: "+919820145991",
      from: "+12057758148",
      body:
        `Your OTP for SecureHealth Patient registration is: ${emailtext}`,            
      });
      return message;

  }

  sms().then(() => {
    console.log("SMS sent!");          
  });

  res.sendFile(path.join("/home/ansh/Downloads/SecureHealth-master/otp.html"));
});
//psignup end

//signup for doctor save the data into session
app.post("/dsignup", function (req, res) {
  req.session.fname = req.body.fname;
  req.session.lname = req.body.lname;
  req.session.email = req.body.email;
  req.session.pass = req.body.pass;
  req.session.phone = req.body.phone;
  var emailtext = generateOTP();
  console.log(emailtext);
  req.session.otp = emailtext;
  //var email = req.body.email;
  const accountSid = "ACd9c13445898ed1dd3eab89f9d4fb99ac";
  const authToken = "3d38700c9f75f060cadc5b075f5da980";
  const client = require("twilio")(accountSid, authToken);

  async function sms() {
    const message = await client.messages.create({
      to: "+919820145991",
      from: "+12057758148",
      body:
        `Your OTP for SecureHealth Doctor registration is: ${emailtext}`,            
      });
      return message;

  }

  sms().then(() => {
    console.log("SMS sent!");          
  });
  /*
  console.log(email);
  var mailOptions = {
    from: "blockvotes@gmail.com",
    to: email,
    subject: "SecureHealth OTP",
    text: emailtext,
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
  */
  res.sendFile(path.join("/home/ansh/Downloads/SecureHealth-master/otp.html"));
  // send user to the otp page
});
//end of /dsignup

//when clciked submit in otp page
app.post("/otp", function (req, res) {
  console.log(req.session.lname);
  if ((req.body.uotp = req.session.otp)) {
    var fn = encrypt(req.session.fname);

    console.log(fn);

    var ln = encrypt(req.session.lname);
    console.log(ln);
    var email = encrypt(req.session.email);
    console.log(email);
    var pass = encrypt(req.session.pass);
    console.log(pass);
    var phone = encrypt(req.session.phone);

    console.log(ln);
    console.log(phone);

    if (req.session.dob == null) {
      res.sendFile(
        path.join(
          "/home/ansh/Downloads/SecureHealth-master/signin-signup/docdetails.html"
        )
      );
    } else {
      console.log(req.session.dob);

      var dob = encrypt(req.session.dob);

      var gen = encrypt(req.session.gen);
      var emgemail = encrypt(req.session.emgemail);
      MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("project");
        var myobj = {
          fname: fn,
          lname: ln,
          email: email,
          password: pass,
          phone: phone,
          dob: dob,
          gen: gen,
          emgemail: emgemail,
        };
        dbo.collection("psignup").insertOne(myobj, function (err, res) {
          if (err) throw err;
          console.log("1 document inserted");
          db.close();
        });
      });
      res.sendFile(
        "/home/ansh/Downloads/SecureHealth-master/signin-signup/patientsignfinal.html"
      );
    }
  } else {
    console.log(req.body.uotp);
    console.log(req.session.otp);
  }
});

app.post("/plogin", function (req, res) {
  req.session.email = encrypt(req.body.email);
  const key = bdb.generateKeypair(req.session.email);
  req.session.key = key;
  console.log(req.session.email);
  var email = encrypt(req.body.email);

  var pass = encrypt(req.body.pass);

  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("project");

    console.log(email);
    //Find the first document in the customers collection:
    dbo.collection("psignup").findOne({ email: email }, function (err, resu) {
      console.log(email);
      if (err) {
        console.log("THIS IS ERROR RESPONSE");
        res.json(err);
      }

      if (email == resu.email && pass == resu.password) {
        console.log(resu.emergency);
        if (resu.emergency === "yes") {
          dbo
            .collection("emergency")
            .find({ emgemail: req.session.email })
            .toArray(function (err, result) {
              console.log(req.session.email);
              console.log(result[0].d_email);
              req.session.d_email = result[0].d_email;
              console.log(req.session.d_email);
              res.redirect("/docsearch");
              //res.render('/home/ansh/Downloads/SecureHealth-master/latestpatientprof1/emergency.ejs',{'email':req.session.email});
            });
        } else {
          //Find the first document in the customers collection:

          console.log("hello");
          res.render(
            "/home/ansh/Downloads/SecureHealth-master/latestpatientprof1/patientaddrec.ejs",
            { email: decrypt(req.session.email) }
          );
        }
      } else {
        console.log("not okay");
      }

      db.close();
    });
  });
});

app.post("/dlogin", function (req, res) {
  var email = req.body.email;
  console.log(email);  
  var pass = encrypt(req.body.pass);
  req.session.docemail = req.body.email;
  const key = bdb.generateKeypair(req.session.docemail);
  req.session.key = key;
  console.log(req.session.key);

  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("project");
    //Find the first document in the customers collection:
    dbo.collection("dsignup").findOne({ email: email }, function (err, result) {
      if (err) throw err;
      console.log(result);
      if (email == result.email && pass == result.password) {
        console.log("hello");

        MongoClient.connect(url, function (err, db) {
          if (err) throw err;
          var dbo = db.db("bigchain");
          //Find the first document in the customers collection:
          var r = [];
          dbo
            .collection("metadata")
            .find({ "metadata.doclist": req.session.docemail })
            .toArray(function (err, result) {
              if (err) throw err;
              console.log(result);
              console.log(result.length);

              var a;
              for (var i = 0; i <= result.length - 1; i++) {
                console.log(decrypt(result[i].metadata.email));
                r.push(decrypt(result[i].metadata.email));
              }
              //console.log(r);

              res.render(
                "/home/ansh/Downloads/SecureHealth-master/latestpatientprof1/docprofile.ejs",
                { docs: result, r: r, email: email }
              );

              db.close();
            });
        });
      } else {
        console.log("not okay");
      }
    });

    db.close();
  });
});

app.post("/dsave", function (req, res) {
  var fn = req.session.fname;

  var uni = req.body.uni;
  console.log(uni);
  var spl = req.body.spl;
  console.log(spl);

  var we = req.body.we;
  console.log(we);
  var gen = req.body.gender;
  console.log(gen);
  var cw = req.body.cw;
  console.log(cw);
  var qual = req.body.qual;
  console.log(qual);

  var ln = req.session.lname;

  var email = req.session.email;

  var pass = encrypt(req.session.pass);

  var phone = req.session.phone;

  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("project");
    var myobj = {
      fname: fn,
      lname: ln,
      email: email,
      password: pass,
      phone: phone,
      cw: cw,
      gen: gen,
      uni: uni,
      spl: spl,
      qual: qual,
      we: we,
    };
    dbo.collection("dsignup").insertOne(myobj, function (err, res) {
      if (err) throw err;
      console.log("1 document inserted");

      dbo
        .collection("dsignup")
        .find({})
        .toArray(function (err, result) {
          if (err) throw err;

          console.log(result);

          db.close();
        });
    });
  });
  res.sendFile(
    path.join(
      "/home/ansh/Downloads/SecureHealth-master/signin-signup/docsignfinal.html"
    )
  );
});
app.get("/patientmedhistory", function (req, res) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("bigchain");
    //Find the first document in the customers collection:
    dbo
      .collection("assets")
      .find({ "data.email": req.session.email })
      .toArray(function (err, result) {
        if (err) throw err;

        console.log(result);
        console.log(decrypt(req.session.email));
        res.render(
          "/home/ansh/Downloads/SecureHealth-master/latestpatientprof1/patientmedhistory.ejs",
          { doc: result, email: decrypt(req.session.email) }
        );

        db.close();
      });
  });
});
app.get("/patientdoclist", function (req, res) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var db1 = db.db("project");
    db1
      .collection("dsignup")
      .find({})
      .toArray(function (err, result) {
        if (err) throw err;
        res.render(
          "/home/ansh/Downloads/SecureHealth-master/latestpatientprof1/patientdoclist.ejs",
          { docs: result, email: decrypt(req.session.email) }
        );
      });
  });

  app.post("/access", function (req, res) {
    console.log(req.body.value);
    req.session.demail = req.body.value;
    MongoClient.connect(url, function (err, db) {
      if (err) throw err;
      var dbo = db.db("bigchain");

      dbo
        .collection("assets")
        .find({ "data.email": req.session.email })
        .toArray(function (err, result) {
          if (err) throw err;

          console.log(result);
          res.render(
            "/home/ansh/Downloads/SecureHealth-master/latestpatientprof1/patientaccesstrans.ejs",
            { doc: result, email: decrypt(req.session.email) }
          );

          db.close();
        });
    });
  });
});

app.post("/logout", function (req, res) {
  req.session.destroy();
  res.sendFile(
    path.join(
      "/home/ansh/Downloads/SecureHealth-master/home-20200414T045206Z-001/home/SampleScroll.html"
    )
  );
});

app.post("/submitrec", function (req, res) {
  console.log(req.body.d);
  new formidable.IncomingForm().parse(req, (err, fields, files) => {
    console.log("hello");
    if (err) {
      console.error("Error", err);
      throw err;
    }
    console.log("heyy");
    var fpath = files.fileupload.path;
    console.log(fpath);
    console.log(fields.d);

    //Reading file from computer
    let testFile = fs.readFileSync(fpath);

    //Creating buffer for ipfs function to add file to the system
    let testBuffer = new Buffer(testFile);

    //Addfile router for adding file a local file to the IPFS network without any local node

    ipfs.files.add(testBuffer, function (err, filee) {
      if (err) {
        console.log(err);
      }
      console.log(filee[0].hash);

      var a = encrypt(filee[0].hash);
      var id = generateOTP();

      const assetdata = {
        email: req.session.email,
        file: a,
        id: id,
        description: fields.d,
      };

      const metadata = {
        email: req.session.email,
        datetime: new Date().toString(),
        doclist: [],
        revokelist: [],
        id: id,
      };

      // Construct a transaction payload
      const txCreateAliceSimple = driver.Transaction.makeCreateTransaction(
        assetdata,
        metadata,

        // A transaction needs an output
        [
          driver.Transaction.makeOutput(
            driver.Transaction.makeEd25519Condition(req.session.key.publicKey)
          ),
        ],
        req.session.key.publicKey
      );

      // Sign the transaction with private keys of Alice to fulfill it
      const txCreateAliceSimpleSigned = driver.Transaction.signTransaction(
        txCreateAliceSimple,
        req.session.key.privateKey
      );

      // Send the transaction off to BigchainDB

      conn.postTransactionCommit(txCreateAliceSimpleSigned);
      conn1
        .postTransactionCommit(txCreateAliceSimpleSigned)

        .then((retrievedTx) =>
          console.log("Transaction", retrievedTx.id, "successfully posted.")
        );
      // With the postTransactionCommit if the response is correct, then the transaction
      // is valid and commited to a block
      res.render(
        "/home/ansh/Downloads/SecureHealth-master/latestpatientprof1/patientaddrec.ejs",
        { email: decrypt(req.session.email) }
      );
    });
  });
});
app.get("/patientaddrec", function (req, res) {
  res.render(
    "/home/ansh/Downloads/SecureHealth-master/latestpatientprof1/patientaddrec.ejs",
    { email: decrypt(req.session.email) }
  );
});
app.post("/view", function (req, res) {
  console.log(decrypt(req.body.b));

  var url = "https://ipfs.io/ipfs/";
  var url1 = decrypt(req.body.b);
  var url2 = url + url1;
  res.redirect(url2);
});
app.post("/check", function (req, res) {
  var count = Object.keys(req.body).length;
  console.log(count);

  for (i = 0; i < count; i++) {
    if (req.body[i] == undefined) {
      count++;
    } else {
      console.log(i);
      console.log(req.body[i]);
      getAsset(
        req.body[i],
        req.session.key.publicKey,
        req.session.key.privateKey,
        req.session.demail
      );
    }
  }
  res.redirect("/patientaddrec");
});
app.get("/revoke", function (req, res) {
  var rev = [];
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("bigchain");
    //Find the first document in the customers collection:

    dbo
      .collection("metadata")
      .find({
        "metadata.email": req.session.email,
        "metadata.doclist": { $ne: "0" },
      })
      .toArray(function (err, result) {
        console.log(result);
        for (var i = 0; i <= result.length - 1; i++) {
          var a = result[i].metadata.doclist;
          if (a.length == "0") {
            continue;
          } else {
            rev.push(result[i].metadata.id);
          }
        }
        console.log(rev);
        res.render(
          "/home/ansh/Downloads/SecureHealth-master/latestpatientprof1/patientrevokeaccess.ejs",
          { doc: rev, email: decrypt(req.session.email) }
        );
      });
  });
});

app.post("/revokelist", function (req, res) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("bigchain");
    req.session.bu = req.body.bu;
    console.log(req.body.bu);
    dbo
      .collection("metadata")
      .find({ "metadata.id": req.body.bu })
      .sort({ _id: -1 })
      .limit(1)
      .toArray(function (err, result) {
        console.log(result);
        res.render(
          "/home/ansh/Downloads/SecureHealth-master/latestpatientprof1/revokelist.ejs",
          { doc: result, email: decrypt(req.session.email) }
        );
      });
  });
});

app.post("/finalrevoke", function (req, res) {
  console.log(req.body.b);
  upd(req.session.bu);
  revokeAsset(
    req.session.bu,
    req.session.key.publicKey,
    req.session.key.privateKey,
    req.body.b
  );
  res.redirect("/revoke");
});
app.post("/docview", function (req, res) {
  var viewb = req.body.id;
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("bigchain");

    console.log(req.body.id);
    dbo
      .collection("assets")
      .findOne({ "data.id": req.body.id }, function (err, result) {
        console.log(result);
        console.log(result.data.file);
        var rfile = result.data.file;
        var url = "https://ipfs.io/ipfs/";
        var url1 = decrypt(rfile);
        var url2 = url + url1;
        res.redirect(url2);
      });
  });
});
app.post("/prescription", function (req, res) {
  req.session.aid = req.body.aid;
  res.render(
    "/home/ansh/Downloads/SecureHealth-master/latestpatientprof1/prescrip.ejs",
    { email: req.session.docemail }
  );
});
app.post("/submitpres", function (req, res) {
  console.log(req.session.pemail);
  console.log(req.body.alg);
  console.log(req.body.splcare);
  console.log(req.body.advice);
  console.log(req.body.sug);
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("bigchain");
    //Find the first document in the customers collection:
    console.log(req.session.aid);
    dbo
      .collection("assets")
      .findOne({ "data.id": req.session.aid }, function (err, result) {
        console.log(result.data.email);

        const patient_key = bdb.generateKeypair(result.data.email);

        const assetdata = {
          pid: req.session.aid,
          docemail: encrypt(req.session.docemail),
          presemail: result.data.email,
          allergy: encrypt(req.body.alg),
          splcare: encrypt(req.body.splcare),
          advice: encrypt(req.body.advice),
          suggestion: encrypt(req.body.sug),
        };

        const metadata = {
          datetime: new Date().toString(),
        };

        const txCreateAliceSimple = driver.Transaction.makeCreateTransaction(
          assetdata,
          metadata,

          // A transaction needs an output
          [
            driver.Transaction.makeOutput(
              driver.Transaction.makeEd25519Condition(req.session.key.publicKey)
            ),
          ],
          req.session.key.publicKey
        );

        // Sign the transaction with private keys of Alice to fulfill it
        const txCreateAliceSimpleSigned = driver.Transaction.signTransaction(
          txCreateAliceSimple,
          req.session.key.privateKey
        );

        // Send the transaction off to BigchainDB
        const conn = new driver.Connection(API_PATH);

        conn
          .postTransactionCommit(txCreateAliceSimpleSigned)
          .then((retrievedTx) =>
            console.log("Transaction", retrievedTx.id, "successfully posted.")
          )
          // With the postTransactionCommit if the response is correct, then the transaction
          // is valid and commited to a block

          // Transfer bicycle to Bob
          .then(() => {
            const txTransferBob = driver.Transaction.makeTransferTransaction(
              // signedTx to transfer and output index
              [{ tx: txCreateAliceSimpleSigned, output_index: 0 }],
              [
                driver.Transaction.makeOutput(
                  driver.Transaction.makeEd25519Condition(patient_key.publicKey)
                ),
              ],
              // metadata
              { datetime: new Date().toString() }
            );

            // Sign with alice's private key
            let txTransferBobSigned = driver.Transaction.signTransaction(
              txTransferBob,
              req.session.key.privateKey
            );
            console.log("Posting signed transaction: ", txTransferBobSigned);

            // Post with commit so transaction is validated and included in a block
            return conn.postTransactionCommit(txTransferBobSigned);
          });

        var emailtext =
          "You have recieved a new prescription from doctor " +
          req.session.docemail +
          ".Check it out!!!";
        var mailOptions = {
          from: "blockvotes@gmail.com",
          to: decrypt(result.data.email),
          subject: "SecureHealth",
          text: emailtext,
        };
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log("Email sent: " + info.response);
          }
        });

        res.redirect("/docpro");
        db.close();
      });
  });
});
app.get("/viewpres", function (req, res) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("bigchain");
    //Find the first document in the customers collection:
    var arr = [];
    var allergy = [];
    var splcare = [];
    var advice = [];
    var sugg = [];
    dbo
      .collection("assets")
      .find({ "data.presemail": req.session.email })
      .toArray(function (err, result) {
        console.log(result);
        console.log(result.length);
        for (var i = 0; i <= result.length - 1; i++) {
          arr.push(decrypt(result[i].data.docemail));
          allergy.push(decrypt(result[i].data.allergy));
          splcare.push(decrypt(result[i].data.splcare));
          advice.push(decrypt(result[i].data.advice));
          sugg.push(decrypt(result[i].data.suggestion));
        }
        console.log(arr);
        console.log("allergy" + allergy);
        db.close();
        res.render(
          "/home/ansh/Downloads/SecureHealth-master/latestpatientprof1/preslist.ejs",
          {
            doc: result,
            arr: arr,
            allergy: allergy,
            splcare: splcare,
            advice: advice,
            suggestion: sugg,
            email: decrypt(req.session.email),
          }
        );
      });
  });
});
app.get("/docpro", function (req, res) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("bigchain");
    //Find the first document in the customers collection:
    var r = [];
    dbo
      .collection("metadata")
      .find({ "metadata.doclist": req.session.docemail })
      .toArray(function (err, result) {
        if (err) throw err;
        console.log(result);
        console.log(result.length);

        for (var i = 0; i <= result.length - 1; i++) {
          console.log(decrypt(result[i].metadata.email));
          r.push(decrypt(result[i].metadata.email));
        }

        res.render(
          "/home/ansh/Downloads/SecureHealth-master/latestpatientprof1/docprofile.ejs",
          { docs: result, r: r, email: req.session.docemail }
        );

        db.close();
      });
  });
});
app.post("/profiled", function (req, res) {
  console.log("heyyyy");
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("project");
    //Find the first document in the customers collection:

    dbo
      .collection("psignup")
      .findOne({ email: req.body.bemail }, function (err, result) {
        console.log(result);
        var fname = decrypt(result.fname);
        var lname = decrypt(result.lname);
        var email1 = decrypt(result.email);
        var phone = decrypt(result.phone);
        var dob = decrypt(result.dob);
        var gen = decrypt(result.gen);
        var currentYear = new Date().getFullYear();
        const todaysDate = new Date();

        console.log(fname);

        res.render(
          "/home/ansh/Downloads/SecureHealth-master/latestpatientprof1/patienthome.ejs",
          {
            fname: fname,
            lname: lname,
            email: req.session.docemail,
            phone: phone,
            dob: dob,
            gen: gen,
            email1: email1,
            cy: currentYear,
            ny: todaysDate,
          }
        );
      });
  });
});
app.post("/emergency", function (req, res) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("project");
    //Find the first document in the customers collection:

    dbo
      .collection("emergency")
      .find({ emgemail: req.session.email })
      .sort({ _id: -1 })
      .limit(1)
      .toArray(function (err, result) {
        console.log(result);

        var mailOptions = {
          from: "blockvotes@gmail.com",
          to: result[0].d_email,
          subject: "SecureHealth:",
          text:
            "The medical records of " +
            decrypt(result[0].p_email) +
            "have been recieved.",
        };
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log("Email sent: " + info.response);
          }
        });

        var dbob = db.db("bigchain");
        //Find the first document in the customers collection:
        dbob
          .collection("assets")
          .find({ "data.email": result[0].p_email })
          .toArray(function (err, resu) {
            console.log(result[0].p_email);
            const emgkey = bdb.generateKeypair(result[0].p_email);
            for (var i = 0; i <= resu.length - 1; i++) {
              console.log(resu[i].data.id);

              var emeremail = result[0].d_email;

              getAsset(
                resu[i].data.id,
                emgkey.publicKey,
                emgkey.privateKey,
                emeremail
              );
            }
            dbo
              .collection("psignup")
              .findOneAndUpdate(
                { email: result[0].emgemail },
                { $set: { emergency: "no" } },
                { upsert: true, returnNewDocument: true, sort: { _id: -1 } },
                function (err, doc) {
                  if (err) {
                    throw err;
                  } else {
                    console.log("Updated");
                  }
                }
              );

            res.redirect(307, "/logout");
          });
      });
  });
});
app.post("/emgform", function (req, res) {
  res.sendFile(
    "/home/ansh/Downloads/SecureHealth-master/latestpatientprof1/form.html"
  );
});
app.post("/emgsave", function (req, res) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("project");
    /*
var myobj = { p_email:encrypt(req.body.patemail),incident:req.body.incident,d_email:req.session.docemail,emgemail:resu[0].emgemail};
  dbo.collection("emergency").insertOne(myobj, function(err, re) {
    if (err) throw err
    console.log("1 document inserted");
})
*/
    dbo
      .collection("psignup")
      .find({ email: encrypt(req.body.patemail) })
      .toArray(function (err, resu) {
        console.log(resu);

        console.log(resu[0].emgemail);
        var emgtext =
          "Your dear one is in trouble.Please log in to our application and check it out. ";
        var mailOptions = {
          from: "blockvotes@gmail.com",
          to: decrypt(resu[0].emgemail),
          subject: "SecureHealth:EMERGENCY!!!!",
          text: emgtext,
        };
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log("Email sent: " + info.response);
          }
        });

        const accountSid = "ACd9c13445898ed1dd3eab89f9d4fb99ac";
        const authToken = "3d38700c9f75f060cadc5b075f5da980";
        const client = require("twilio")(accountSid, authToken);

        async function wa() {
          const message = await client.messages.create({
            body:
              "Hurry! There's some emergency. Please log in and grant access to your records, doctor needs it",
            // mediaUrl: 'https://climacons.herokuapp.com/clear.png',
            from: "whatsapp:+14155238886",
            to: "whatsapp:+919820145991",
          });
          return message;
        }

        async function sms() {
          const message = await client.messages.create({
            to: "+919820145991",
            from: "+12057758148",
            body:
              "Hurry! There's some emergency. Please log in and grant access to your records, doctor needs it",
            // mediaUrl: 'https://climacons.herokuapp.com/clear.png',
          });
          return message;
        }

        sms().then(() => {
          console.log("SMS sent!");
          wa().then(() => {
            console.log("Whatsapp sent!");
          });
        });

        dbo
          .collection("psignup")
          .findOneAndUpdate(
            { email: resu[0].emgemail },
            { $set: { emergency: "yes" } },
            { upsert: true, returnNewDocument: true, sort: { _id: -1 } },
            function (err, doc) {
              if (err) {
                throw err;
              } else {
                console.log("Updated");
              }
              var myobj = {
                p_email: encrypt(req.body.patemail),
                incident: req.body.incident,
                d_email: req.session.docemail,
                emgemail: resu[0].emgemail,
              };
              dbo.collection("emergency").insertOne(myobj, function (err, re) {
                if (err) throw err;
                console.log("1 document inserted");
              });
              res.redirect("/docpro");
            }
          );
      });
  });
});
app.get("/docsearch", function (req, res) {
  console.log(req.session.d_email);
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("project");
    dbo
      .collection("dsignup")
      .find({ email: req.session.d_email })
      .toArray(function (err, resu) {
        console.log(resu);
        res.render(
          "/home/ansh/Downloads/SecureHealth-master/latestpatientprof1/emergency.ejs",
          { email: decrypt(req.session.email), docs: resu }
        );
      });
  });
});
//add the router

app.use("/", router);
app.listen(process.env.port || 8080);
