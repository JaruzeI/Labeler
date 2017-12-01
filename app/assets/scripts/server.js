//#region Declaring modules
var express = require('express');
var fileUpload = require('express-fileupload');
var fs = require('fs');
var xml2js = require('xml2js');
var http = require('http');
var request = require('request');
var path = require('path');
var xmlreader = require('xmlreader');
var pdf = require('html-pdf');
var ejs = require('ejs');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

io.on('connection', function(socket){ 
  io.on('disconnect', function(){
    saveDir = (path.resolve(__dirname + '/../../../uploaded_files'));
    socket.emit('disconnected');
  })

  socket.on('logout', function(){
    saveDir = (path.resolve(__dirname + '/../../../uploaded_files'));
    socket.emit('disconnected');
  });

  socket.on('login submit', function(username, password){
    User.findOne({username: username}, function(err, user) {
      if(err) {
        console.log(err);
        socket.emit('login response', "Sorry, error occured.");
        return false;
      }
  
      if(!user) {
        socket.emit('login response', "Wrong username");
        return false;
      }
  
      // test a matching password
      user.comparePassword(password, function(err, isMatch) {
        if (isMatch == true) {
          //req.session.user = user;
          saveDir = path.resolve(__dirname + '/../../../user_files/' + user._id);
          socket.emit('login response', "success");
          return false;
        } else {
          socket.emit('login response', "Wrong password");
          return false;
        }
      });      
    });
  });
  
});

var User = require('./lib/User.js');

mongoose.connect('mongodb://mongodb://localhost/mean-app')

//var User = require('./models/register');
//#endregion END OF Declaring modules

// options is a variable used by html-pdf module
var options = { "height": "634px", "width": "448px" };
var saveDir = (path.resolve(__dirname + '/../../../uploaded_files'));

app.use(fileUpload());
app.use(bodyParser.json());
app.use(session({secret:"uifh783fh38fbwedicw9c23bh493h"/*PLACEHOLDER SECRET!! Have to change this later.*/,resave:false,saveUninitialized:true}));
app.set("view engine", "ejs");

// Setting static path to assets folder (required for ejs)
app.use(express.static(path.resolve(__dirname + "/../../assets")));

//#region Declaring functions
// Function for downloading from url
function download(uri, filename, callback){
  request.head(uri, function(err, res, body){
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);

    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

// Function for filling ejs template with data and converting it to html file
function ejs2html(path, information, req, res) {
  fs.readFile(path, 'utf8', function (err, data) {
      if (err) { console.log(err); return false; }
      var ejs_string = data,
          template = ejs.compile(ejs_string),
          html = template(information);
      fs.writeFile(path + '.html', html, req, res, function(err) {
          if(err) { console.log(err); return false }
          createPDF(req, res);
          return true;
      });  
  });
};

// Function for creating pdf file from html
function createPDF(req, res) {
  fs.readFile(path.resolve(__dirname + '/views/eti.ejs.html'), 'utf8', function (err, data) {
    pdf.create(data, options).toFile(path.resolve(saveDir + '/pdf/etykiety.pdf'), function(err, result) {
      if (err) return console.log(err);
      if (req.body.action == "Preview")
      {
        res.sendFile(path.resolve(saveDir + '/pdf/etykiety.pdf'));
      } else if (req.body.action == "Download") {
        res.download(path.resolve(saveDir + '/pdf/etykiety.pdf'));
      }
    });
  });
}
//#endregion END OF Declaring functions
 
app.get('/', function (req, res) {
  res.sendFile(path.resolve(__dirname + '/../../index.html'));
});

app.post('/upload', function(req, res) {
  var xmlDir = saveDir + "/xml/fileFromUrl.xml";
  
  //console.log(uploadFromUrl);
  //console.log(uploadFromDisk.data.toString('utf-8'));

  // Checking if both of the upload options aren't empty.
  if (!req.files.uploadFromDisk && !req.body.uploadFromUrl)
    return res.status(400).send('Please choose one of the upload options');

  // Checking if both of the upload options aren't filled at the same time.
  if (req.files.uploadFromDisk && req.body.uploadFromUrl)
    return res.status(400).send('You cannot upload files from two upload options at the same time');
  
  //#region Saving uploaded file on the server
  // The name of the input field is used to retrieve the uploaded file.
  if (req.files.uploadFromDisk) {
    var uploadFromDisk = req.files.uploadFromDisk;
    if(uploadFromDisk.mimetype != "text/xml") {
      // Not acceptable file type
      return res.status(406);
    }

    // Use the mv() method to place the file somewhere on your server
    uploadFromDisk.mv(xmlDir, function(err) {
      if (err) return res.status(500).send(err);
    });
  }

  if (req.body.uploadFromUrl) {
    var uploadFromUrl = req.body.uploadFromUrl
    download(uploadFromUrl, xmlDir, function() {
      console.log('Upload from url successfull!');
    });
  }

  res.sendFile(path.resolve(__dirname + '/../../label-type.html'));

  //wybierz rodzaj etykiety (dropdown do wyboru / kafelki) + automatyczny podgląd po wyborze / kliknięciu + przycisk pobierz pdf

  //#endregion END OF Saving uploaded file on the server
});

app.post('/label', function(req, res) {
  // Operations on XML file
  var labelNumber = req.body.labelNumber;
  if (labelNumber == null) res.sendFile(path.resolve(__dirname + '/../../label-type.html'));
  else {
    fs.readFile(saveDir + "/xml/fileFromUrl.xml", function(err, data) {
      var xml_file = String(data);
      var title = [], google_product_category = [], description = [], price = [], bestseller = [], gtin = [], additional = [], zlote = [], grosze = [];
      var items_count;
  
      //#region Reading XML and assigning it's values to variables
      xmlreader.read(xml_file, function (err, res){
        if(err) return console.log(err);
          items_count = res.rss.channel.item.count();
          for (i=0; i<items_count; i++)
            {
              title[i] = res.rss.channel.item.at(i).title.text();
              google_product_category[i] = res.rss.channel.item.at(i).google_product_category.text();
              description[i] = res.rss.channel.item.at(i).description.text();
              price[i] = res.rss.channel.item.at(i).price.text();
              bestseller[i] = res.rss.channel.item.at(i).bestseller.text();
              gtin[i] = res.rss.channel.item.at(i).gtin.text();
              additional[i] = res.rss.channel.item.at(i).additional.text();
  
              zlote[i] = price[i].split(".")[0];
              grosze[i] = price[i].split(".")[1];
            }
      });
      //#endregion END OF Reading XML and assigning it's values to variables
      if (labelNumber == 1) {
        //#region Creating string for EJS template file based on received XML
        var ejs_template = '<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <meta http-equiv="X-UA-Compatible" content="ie=edge"> <title>Etykieta</title> <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" /> <style> body { font-family:"Arial"; font-size:6px; color:black; margin-top:30px; } div { position: absolute; width: 189px; } .marka { text-transform:uppercase; text-align:left; font-size: 13px; height: 15px; font-weight: 192; } .typ { text-transform:uppercase; text-align:left; font-size: 8px; height: 15px; font-weight: 600; } .opis { position: absolute; font-weight:normal; line-height:10px; text-align:left; left: 12px; top: 38px; font-size:7px; width: 189px; } .gr { font-size: 22px; font-weight: 168; } .zl { margin-left:12px; line-height:30px; font-size:36px; font-weight: 168; text-align: right; } .kgo { height: 6px; font-size: 5px; color:black; } .najczesciej { border: 2px solid red; height: 12px; background: black; color: white; display: inline-block; font-weight: 600; } .najczesciej-text { left: 17px; top: 10px; } .ean { height: 8px; } </style> <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script> <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script> </head> <body>';
      
        // Creating variables for left and top allignment for elements in EJS template file
        var left_default = 12, left_gr = 168, left_zl = -34, left_ean = 108, left_indeks = 51, top_marka = 12, top_typ = 25, top_opis = 38, top_gr = 88, top_zl = 84, top_kgo = 98, top_najczesciej = 115, top_ean = 130, top_indeks = 144, top_dodatkowe = 156; 
  
        for (i=0; i<items_count; i++) {
          var item_num = i+1;
  
          // Setting values of the left attributes for items
          if (i % 3 == 0) {
            left_default = 12;
            left_gr = 168;
            left_zl = -34;
            left_ean = 108;
            left_indeks = 51;
          } else if (i % 3 == 1 || i % 3 == 2) {
            left_default = left_default + 192;
            left_gr = left_gr + 192;
            left_zl = left_zl + 192;
            left_ean = left_ean + 192;
            left_indeks = left_indeks + 192;
          }
  
          // Setting values of top attributes for items
          if (i % 3 == 0 && i != 0) {
            top_marka = top_marka + 168;
            top_typ = top_typ + 168;
            top_opis = top_opis + 168;
            top_gr = top_gr + 168;
            top_zl = top_zl + 168;
            top_kgo = top_kgo + 168;
            top_najczesciej = top_najczesciej + 168;
            top_ean = top_ean + 168;
            top_indeks = top_indeks + 168;
            top_dodatkowe = top_dodatkowe + 168;
          } 
          
          if (i == 1) {
            ejs_template = ejs_template + '<div style="position: absolute; left: 793px; top: 0px; color: red; border: 2px solid red; height: 12px; background: black; display: inline-block; font-weight: 600;">l</div>'
            for (j=0; j<60; j++) {
              var x = 20*j;
              ejs_template = ejs_template + '<div style="position: absolute; width: 30px; left: '+x+'px; top: 0px;">'+x+'</div>';
            }
          }
  
  
          //Adding item with values from variables to the template
          ejs_template = (ejs_template + '<div class="item'+item_num+'"> <div class="marka" style="left: '+left_default+'px; top: '+top_marka+'px;"><%= title['+i+'] %></div> <div class="typ" style="left: '+left_default+'px;top: '+top_typ+'px;"><%= google_product_category['+i+'] %></div> <div class="opis" style="left: '+left_default+'px;top: '+top_opis+'px;"><%= description['+i+'] %></div> <div class="gr" style=" left: '+left_gr+'px;top: '+top_gr+'px; "><%= grosze['+i+'] %></div><div class="zl" style="left: '+left_zl+'px;top: '+top_zl+'px;"><%= zlote['+i+'] %></div> <div class="kgo" style="top: '+top_kgo+'px;left: '+left_default+'px;">Cena brutto, <br />w tym KGO 2,53zł</div> <div class="najczesciej" style="left: '+left_default+'px; top: '+top_najczesciej+'px;"><div class="najczesciej-text" style="background-color: red;">NAJCZĘŚCIEJ KUPOWANE</div></div> <div class="ean" style="left: '+left_ean+'px; top: '+top_ean+'px; "><img src="file:///I:/Projects/eti/app/assets/images.png" height="42" width="172"/></div> <div class="indeks" style=" top: '+top_indeks+'px;left: '+left_indeks+'px;"><%= gtin['+i+'] %></div> <div class="dodatkowe" style="top: '+top_dodatkowe+'px;left: '+left_default+'px;"><%= additional['+i+'] %></div> </div>');
        }
  
        ejs_template = (ejs_template + '</body></html>');
        //#endregion END OF Creating string for EJS template file based on received XML
      }
  
      /*
      if (numOfLabel == 2) {
        // You can add more label types by adding if statements with corresponding number of label and creating a string for EJS template file, similar to the one above. Don't forget to add label option in select tag in the choose-label.html file.
      }
      */
  
      //#region Operations on EJS template file
      // Creating EJS template file from ejs_template string created earlier
      fs.writeFile(path.resolve(__dirname + '/views/eti') + '.ejs', ejs_template, req, res, function(err) {
        if(err) { console.log(err); return false }
        // Filling EJS template with data and converting it to html file
        ejs2html(__dirname + "/views/eti.ejs", { 
          title: title,
          google_product_category: google_product_category,
          description: description,
          zlote: zlote,
          grosze: grosze,
          bestseller: bestseller,
          gtin: gtin,
          additional: additional
        }, req, res);
        return true;
      });  
  
      console.log(ejs_template);
      //#endregion
    });
  
    // Creating pdf file from html
    // It takes around 3 miliseconds to fill entire data to EJS template.
    // Showing preview of the final pdf file in the browser
  

  }
});

app.post('/register', function(req, res) {
  // Code for saving data from register form in the database, etc.
  if (req.body.email &&
    req.body.username &&
    req.body.password &&
    req.body.passwordConf) {

    User.findOne({username: req.body.username}, function(err, dbUsername) {
      if(err) {
        console.log(err);
        return res.status(500).send();
      }

      if(dbUsername) {
        console.log("This username is already taken");
        return res.status(500).send();
      }

      // Check if there is already user with that email in the database
      User.findOne({email: req.body.email}, function(err, dbEmail) {
        if(err) {
          console.log(err);
          return res.status(500).send();
        }

        if(dbEmail) {
          console.log("This email is already registered");
          return res.status(500).send();
        }

        // If neither username nor email is in the database, add this user to the database
        var newUser = new User();
        newUser.email = req.body.email;
        newUser.username = req.body.username;
        newUser.password = req.body.password;
  
        newUser.save(function (err, savedUser){
          if(err){
            console.log(err);
            res.status(500).send
          } else {
            res.send(savedUser);
          }
        });
  
        // Create folders for files for the new user
        var userFolder = path.resolve(__dirname + '/../../../user_files/' + newUser._id);
        if (!fs.existsSync(userFolder)){
          fs.mkdirSync(userFolder);
          fs.mkdirSync(userFolder + '/json');
          fs.mkdirSync(userFolder + '/xml');
          fs.mkdirSync(userFolder + '/pdf');
        }
      });
    });
  }
});

app.post('/login', function(req, res) {
  /*
  var username = req.body.username;
  var password = req.body.password;
  User.findOne({username: username}, function(err, user) {
    if(err) {
      console.log(err);
      return res.status(500).send();
    }
    if(!user) {
      return res.status(404).send();
    }
    // test a matching password
    user.comparePassword(password, function(err, isMatch) {
      if (isMatch == true) {
        req.session.user = user;
        saveDir = path.resolve(__dirname + '/../../../user_files/' + user._id);
        return res.status(200).send();
      } else {
        return res.status(401).send();
      }
    });
  });*/
});

app.get('/logout', function(req, res) {
  req.session.destroy();
  saveDir = (path.resolve(__dirname + '/../../../uploaded_files'));
  return res.status(200).send();
});

app.get('/dashboard', function(req, res) {
  if (!req.session.user){
    return res.status(401).send();
  }

  return res.status(200).send("Welcome!");
});

/*app.listen(3000, function () {
	console.log('Serwer nasłuchuje na porcie numer', 3000);
});*/

server.listen(3000);