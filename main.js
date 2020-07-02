const express = require('express');
const app = express();
const path = require('path');
const router = express.Router();
var session = require('express-session')
var nodemailer = require('nodemailer');
const driver = require('bigchaindb-driver')
var crypto = require('crypto');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
const ipfsAPI = require('ipfs-api');
const fs = require('fs');

const API_PATH = 'http://localhost:9984/api/v1/'
const API_PATH1 = 'https://test.ipdb.io//api/v1/'
const ipfs = ipfsAPI('ipfs.infura.io', '5001', {protocol: 'https'})
const bdb = require('easy-bigchain')
const conn = new driver.Connection(API_PATH)
const conn1=new driver.Connection(API_PATH1)







var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: '',
    pass: ''
  }
});

function encrypt(text){
  var cipher = crypto.createCipher('aes-256-cbc','d6F3Efeq')
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text){
  var decipher = crypto.createDecipher('aes-256-cbc','d6F3Efeq')
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}




var bodyParser = require('body-parser');
const { nextTick } = require('process');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use(session({secret: 'ssshhhhh',
		resave: false,
  		saveUninitialized: true,}));







function generateOTP() { 
          
    // Declare a digits variable  
    // which stores all digits 
    var digits = '0123456789'; 
    let OTP = ''; 
    for (let i = 0; i < 4; i++ ) { 
        OTP += digits[Math.floor(Math.random() * 10)]; 
    } 
    return OTP; 
} 




app.use(express.static(path.join('/home/rd/project/images')));
app.use(express.static(path.join('/home/rd/project/simple-pre-loader-20200402T153112Z-001')));
app.set('view engine', 'ejs');
//start of main
app.get('/',function(req,res){

  res.sendFile('/home/rd/project/home-20200414T045206Z-001/home/SampleScroll.html');

});
//end of main


//patient start
app.get('/paitent',function(req,res)
{

res.sendFile(path.join('/home/rd/project/signup-20200411T140609Z-001/signin-signup/patientsignfinal.html'));
}
);
//patient end


//psignup start
app.post('/psignup',function(req,res)
{

req.session.fname=req.body.fname;
req.session.lname=req.body.lname;
req.session.email=req.body.email;
req.session.pass=req.body.pass;
req.session.dob=req.body.dob;
req.session.gen=req.body.gen;
req.session.phone=req.body.phone;
req.session.emgemail=req.body.emgemail;
var emailtext= generateOTP() ;
console.log(emailtext); 
req.session.otp=emailtext;
var email=req.body.email;
console.log(email);
var mailOptions = {
  from: 'healtchchain01@gmail.com',
  to: email,
  subject: 'HEALTHCHAIN',
  text: "Your one time password is: "+emailtext,
};
transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log(error);
  } else {
    console.log('Email sent: ' + info.response);  }
});
res.sendFile(path.join('/home/rd/project/otp.html'));
});
//psignup end


app.post('/plogin',function(req,res)
{

req.session.email=encrypt(req.body.email);
const key = bdb.generateKeypair(req.session.email);
req.session.key=key;
console.log(req.session.email);
var email=encrypt(req.body.email);

var pass=encrypt(req.body.pass);

MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  var dbo = db.db("project");

console.log(email);
  //Find the first document in the customers collection:
  dbo.collection("psignup").findOne({email:email}, function(err, resu) {
console.log(email);
if(err) {
          console.log('THIS IS ERROR RESPONSE')
           res.json(err)
        } 
  
	if (email==resu.email && pass==resu.password)
	
{
console.log(resu.emergency);
if(resu.emergency ==='yes')
{
dbo.collection("emergency").find({"emgemail":req.session.email}).toArray( function(err, result)
{
console.log(req.session.email);
console.log(result[0].d_email);
req.session.d_email=result[0].d_email;
console.log(req.session.d_email);
next();

})


}
else

{

 
  //Find the first document in the customers collection:
   
console.log("hello");
res.render('/home/rd/project/latestpatientprof1/patientaddrec.ejs',{'email':decrypt(req.session.email)});
}




}
    else
{
  console.log("not okay");
} 
 
 db.close();
});

 });

}
);






app.post('/logout',function(req,res)
{
req.session.destroy();
 res.sendFile(path.join('/home/rd/project/home-20200414T045206Z-001/home/SampleScroll.html'));
})
//add the router

app.use('/', router);
app.listen(process.env.port || 8080);

