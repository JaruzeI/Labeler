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

var User = require('./lib/User.js');

mongoose.connect('mongodb://mongodb://localhost/mean-app')

//var User = require('./models/register');
//#endregion END OF Declaring modules

// options is a variable used by html-pdf module
var options = {};
var saveDir = (path.resolve(__dirname + '/../../../uploaded_files'));

app.use(fileUpload());
app.use(bodyParser.json());
app.use(session({secret:"uifh783fh38fbwedicw9c23bh493h"/*PLACEHOLDER SECRET!! Have to change this later.*/,resave:false,saveUninitialized:true}));
app.set("view engine", "ejs");

// Setting static path to assets folder (required for ejs)
app.use(express.static(path.resolve(__dirname + "/../../assets")));
app.use(express.static(path.resolve(__dirname + "/../../../uploaded_files/pdf")));
app.use(express.static(path.resolve(__dirname + "/../../../user_files")));

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
function ejs2html(path, information, req, res, options) {
  fs.readFile(path, 'utf8', function (err, data) {
      if (err) { console.log(err); return false; }
      var ejs_string = data,
          template = ejs.compile(ejs_string),
          html = template(information);
          fs.writeFile(__dirname + "/views/eti.ejs" + '.html', html, req, res, options, function(err) {
            if(err) { console.log(err); return false }
            return res.send(html);
          }); 
  });
};

// Function for creating pdf file from html
function createPDF(req, res, options) {
  fs.readFile(path.resolve(__dirname + '/views/eti.ejs.html'), 'utf8', function (err, data) {
    var pdfName = "label--" + new Date().getTime();
    console.log(pdfName);
    pdf.create(data, options).toFile(path.resolve(saveDir + '/pdf/' + pdfName + '.pdf'), function(err, result) {
      if (err) return console.log(err);
        console.log(pdfName);
        if (req.session.user){
          return res.send({"user":req.session.user._id, "pdfName":pdfName});
        } else {
          return res.send(pdfName);
        }
        //res.download(path.resolve(saveDir + '/pdf/etykiety.pdf'));
    });
  });
}
//#endregion END OF Declaring functions
 
app.get('/', function (req, res) {
  res.sendFile(path.resolve(__dirname + '/../../index.html'));
});

// Activated right after the DOM is created. Used in client-side for displaying correct buttons (login/logout, etc.).
app.get('/isSessionActive', function (req, res) {
  if(req.session.user){
    res.send("1");
  } else {
    res.send("0");
  }
});

app.post('/upload', function(req, res) {
  console.log(req.body);
  var xmlDir = saveDir + "/xml/fileFromUrl.xml";

  //console.log(uploadFromUrl);
  //console.log(uploadFromDisk.data.toString('utf-8'));

  // Checking if both of the upload options aren't empty.
  if (!req.body.upload_file && !req.body.uploadFromUrl)
    return res.send('Please choose one of the upload options');

  // Checking if both of the upload options aren't filled at the same time.
  if (req.body.upload_file && req.body.uploadFromUrl)
    return res.send('You cannot upload files from two upload options at the same time');
  
  //#region Saving uploaded file on the server
  // The name of the input field is used to retrieve the uploaded file.
  if (req.body.upload_file) {
    var uploadFromDisk = req.files.uploadFromDisk;
    if(uploadFromDisk.mimetype != "text/xml") {
      // Not acceptable file type
      return res.send('You can only upload XML files');
    }

    // Use the mv() method to place the file somewhere on your server
    uploadFromDisk.mv(xmlDir, function(err) {
      if (err) {
        console.log(err);
        return res.send('Sorry! There was an error and we could not save the file on the server. Please try again later.');
      }
    });
  }

  if (req.body.uploadFromUrl) {
    var uploadFromUrl = req.body.uploadFromUrl
    try {
      download(uploadFromUrl, xmlDir, function(err) {
        console.log('Upload from url successfull!');
      });
    }
    catch(err) {
      console.log(err);
      return res.send('Sorry! We were not able to access this url. Please make sure that the link to the file is correct and the file is accessable.');
    }
  }

  return res.send('fileUploaded');
  //res.sendFile(path.resolve(__dirname + '/../../label-type.html'));

  //#endregion END OF Saving uploaded file on the server
});

app.post('/preview', function(req, res) {
  // Operations on XML file
  var labelNumber = req.body.labelNumber;
  var pageWidth = req.body.documentWidth *0.95;
  // options is a variable used by html-pdf module
  options = { "height": pageWidth * 1.1007, "width": pageWidth * 0.7778 };
  console.log(labelNumber);
  console.log(pageWidth);
  if (labelNumber != null) 
  {
    fs.readFile(saveDir + "/xml/fileFromUrl.xml", function(err, data) {
      if(err) { console.log(err); return false; }
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

      // Check if it's preview or user clicked download button
        if (labelNumber == 1){
          // Creating variables for left and top allignment for elements in EJS template file
          var left_default = pageWidth * 0.0208, left_gr = pageWidth * 0.2917, left_zl = -pageWidth * 0.059, left_ean = pageWidth * 0.1875, left_indeks = pageWidth * 0.0886, top_marka = pageWidth * 0.0208, top_typ = pageWidth * 0.0434, top_opis = pageWidth * 0.066, top_gr = pageWidth * 0.1528, top_zl = pageWidth * 0.1458, top_kgo = pageWidth * 0.1701, top_najczesciej = pageWidth * 0.1996, top_ean = pageWidth * 0.2257, top_indeks = pageWidth * 0.25, top_dodatkowe = pageWidth * 0.271, najczesciej_rect_width = pageWidth * 0.3279; najczesciej_rect_height = pageWidth * 0.0174;

          var width_default = pageWidth * 0.3279;

          var width_gr = width_default - left_gr + left_default,
              width_ean = width_default - left_ean + left_default,
              width_indeks = width_default - left_indeks + left_default;
          //#region Creating string for EJS template file based on received XML
          var ejs_template = '<style> #test { font-family:"Arial"; font-size: '+pageWidth * 0.0104+'px; -webkit-text-fill-color: black; } #test div { position: absolute; width: '+width_default+'px; } .marka { text-transform:uppercase; text-align:left; font-size: '+pageWidth * 0.0226+'px; height: '+pageWidth * 0.0260+'px; font-weight: 192; } .typ { text-transform:uppercase; text-align:left; font-size: '+pageWidth * 0.0139+'px; height: '+pageWidth * 0.0260+'px; font-weight: 600; } .opis { position: absolute; font-weight:normal; line-height:'+pageWidth * 0.0174+'px; text-align:left; font-size:'+pageWidth * 0.0122+'px; width: '+pageWidth * 0.3279+'px; } #test div .gr { font-size: '+pageWidth * 0.0382+'px; font-weight: 168; width: '+width_gr+'px; } .zl { margin-left:'+pageWidth * 0.0208+'px; line-height:'+pageWidth * 0.0521+'px; font-size:'+pageWidth * 0.0625+'px; font-weight: 168; text-align: right; } .kgo { height: '+pageWidth * 0.0104+'px; font-size: '+pageWidth * 0.0087+'px; } .najczesciej-text { left: '+pageWidth * 0.004+'px; top: '+pageWidth * 0.002+'px; -webkit-text-fill-color: white; } #test div .ean { height: '+pageWidth * 0.0139+'px; width: '+width_ean+'px; } #test div .indeks { width: '+width_indeks+'px; } </style>'
    
          for (i=0; i<items_count; i++) {
            var item_num = i+1;
            
              // Setting values of the left attributes for items in preview
              if (i % 3 == 0) {
                left_default = pageWidth * 0.0208;
                left_gr = pageWidth * 0.2917;
                left_zl = -pageWidth * 0.059;
                left_ean = pageWidth * 0.1875;
                left_indeks = pageWidth * 0.0886;
              } else if (i % 3 == 1 || i % 3 == 2) {
                left_default = left_default + (pageWidth * 0.3333);
                left_gr = left_gr + (pageWidth * 0.3333);
                left_zl = left_zl + (pageWidth * 0.3333);
                left_ean = left_ean + (pageWidth * 0.3333);
                left_indeks = left_indeks + (pageWidth * 0.3333);
              }
      
              // Setting values of top attributes for items in preview
              if (i % 3 == 0 && i != 0) {
                top_marka = top_marka + pageWidth * 0.2915;
                top_typ = top_typ + pageWidth * 0.2915;
                top_opis = top_opis + pageWidth * 0.2915;
                top_gr = top_gr + pageWidth * 0.2915;
                top_zl = top_zl + pageWidth * 0.2915;
                top_kgo = top_kgo + pageWidth * 0.2915;
                top_najczesciej = top_najczesciej + pageWidth * 0.2915;
                top_ean = top_ean + pageWidth * 0.2915;
                top_indeks = top_indeks + pageWidth * 0.2915;
                top_dodatkowe = top_dodatkowe + pageWidth * 0.2915;
              } 
    
    
            //Adding item with values from variables to the template
            ejs_template = (ejs_template + '<div id="test"><div class="item'+item_num+'"> <div class="marka" style="left: '+left_default+'px; top: '+top_marka+'px;"><%= title['+i+'] %></div> <div class="typ" style="left: '+left_default+'px;top: '+top_typ+'px;"><%= google_product_category['+i+'] %></div> <div class="opis" style="left: '+left_default+'px;top: '+top_opis+'px;"><%= description['+i+'] %></div> <div class="gr" style=" left: '+left_gr+'px;top: '+top_gr+'px; "><%= grosze['+i+'] %></div><div class="zl" style="left: '+left_zl+'px;top: '+top_zl+'px;"><%= zlote['+i+'] %></div> <div class="kgo" style="top: '+top_kgo+'px;left: '+left_default+'px;">Cena brutto, <br />w tym KGO 2,53zł</div> <div class="najczesciej" style="left: '+left_default+'px; top: '+top_najczesciej+'px;"><svg width="'+najczesciej_rect_width+'" height="'+najczesciej_rect_height+'"><rect width="'+najczesciej_rect_width+'" height="'+najczesciej_rect_height+'" style="fill:rgb(0,0,0);" /></svg><div class="najczesciej-text">NAJCZĘŚCIEJ KUPOWANE</div></div> <div class="ean" style="left: '+left_ean+'px; top: '+top_ean+'px; "><img src="" height="42" width="172"/></div> <div class="indeks" style=" top: '+top_indeks+'px;left: '+left_indeks+'px;"><%= gtin['+i+'] %></div> <div class="dodatkowe" style="top: '+top_dodatkowe+'px;left: '+left_default+'px;"><%= additional['+i+'] %></div></div></div>');
          }
        }
        if (labelNumber == 2) {
          // Creating variables for left and top allignment for elements in EJS template file
          var left_default = pageWidth * 0.0208, left_gr = pageWidth * 0.2917, left_zl = -pageWidth * 0.059, left_ean = pageWidth * 0.1875, left_indeks = pageWidth * 0.0886, top_marka = pageWidth * 0.0208, top_typ = pageWidth * 0.0434, top_opis = pageWidth * 0.066, top_gr = pageWidth * 0.1528, top_zl = pageWidth * 0.1458, top_kgo = pageWidth * 0.1701, top_najczesciej = pageWidth * 0.1996, top_ean = pageWidth * 0.2257, top_indeks = pageWidth * 0.25, top_dodatkowe = pageWidth * 0.271, najczesciej_rect_width = pageWidth * 0.3279; najczesciej_rect_height = pageWidth * 0.0174;
          
          var width_default = pageWidth * 0.3279;

          var width_gr = width_default - left_gr + left_default,
              width_ean = width_default - left_ean + left_default,
              width_indeks = width_default - left_indeks + left_default;
          //#region Creating string for EJS template file based on received XML
          var ejs_template = '<style> #test { font-family:"Arial"; font-size: '+pageWidth * 0.0104+'px; -webkit-text-fill-color: red; } #test div { position: absolute; width: '+width_default+'px; } .marka { text-transform:uppercase; text-align:left; font-size: '+pageWidth * 0.0226+'px; height: '+pageWidth * 0.0260+'px; font-weight: 192; } .typ { text-transform:uppercase; text-align:left; font-size: '+pageWidth * 0.0139+'px; height: '+pageWidth * 0.0260+'px; font-weight: 600; } .opis { position: absolute; font-weight:normal; line-height:'+pageWidth * 0.0174+'px; text-align:left; font-size:'+pageWidth * 0.0122+'px; width: '+pageWidth * 0.3279+'px; } #test div .gr { font-size: '+pageWidth * 0.0382+'px; font-weight: 168; width: '+width_gr+'px; } .zl { margin-left:'+pageWidth * 0.0208+'px; line-height:'+pageWidth * 0.0521+'px; font-size:'+pageWidth * 0.0625+'px; font-weight: 168; text-align: right; } .kgo { height: '+pageWidth * 0.0104+'px; font-size: '+pageWidth * 0.0087+'px; } .najczesciej-text { left: '+pageWidth * 0.004+'px; top: '+pageWidth * 0.002+'px; -webkit-text-fill-color: white; } #test div .ean { height: '+pageWidth * 0.0139+'px; width: '+width_ean+'px; } #test div .indeks { width: '+width_indeks+'px; } </style>'
    
          for (i=0; i<items_count; i++) {
            var item_num = i+1;
            
              // Setting values of the left attributes for items in preview
              if (i % 3 == 0) {
                left_default = pageWidth * 0.0208;
                left_gr = pageWidth * 0.2917;
                left_zl = -pageWidth * 0.059;
                left_ean = pageWidth * 0.1875;
                left_indeks = pageWidth * 0.0886;
              } else if (i % 3 == 1 || i % 3 == 2) {
                left_default = left_default + (pageWidth * 0.3333);
                left_gr = left_gr + (pageWidth * 0.3333);
                left_zl = left_zl + (pageWidth * 0.3333);
                left_ean = left_ean + (pageWidth * 0.3333);
                left_indeks = left_indeks + (pageWidth * 0.3333);
              }
      
              // Setting values of top attributes for items in preview
              if (i % 3 == 0 && i != 0) {
                top_marka = top_marka + pageWidth * 0.2915;
                top_typ = top_typ + pageWidth * 0.2915;
                top_opis = top_opis + pageWidth * 0.2915;
                top_gr = top_gr + pageWidth * 0.2915;
                top_zl = top_zl + pageWidth * 0.2915;
                top_kgo = top_kgo + pageWidth * 0.2915;
                top_najczesciej = top_najczesciej + pageWidth * 0.2915;
                top_ean = top_ean + pageWidth * 0.2915;
                top_indeks = top_indeks + pageWidth * 0.2915;
                top_dodatkowe = top_dodatkowe + pageWidth * 0.2915;
              } 
    
    
            //Adding item with values from variables to the template
            ejs_template = (ejs_template + '<div id="test"><div class="item'+item_num+'"> <div class="marka" style="left: '+left_default+'px; top: '+top_marka+'px;"><%= title['+i+'] %></div> <div class="typ" style="left: '+left_default+'px;top: '+top_typ+'px;"><%= google_product_category['+i+'] %></div> <div class="opis" style="left: '+left_default+'px;top: '+top_opis+'px;"><%= description['+i+'] %></div> <div class="gr" style=" left: '+left_gr+'px;top: '+top_gr+'px; "><%= grosze['+i+'] %></div><div class="zl" style="left: '+left_zl+'px;top: '+top_zl+'px;"><%= zlote['+i+'] %></div> <div class="kgo" style="top: '+top_kgo+'px;left: '+left_default+'px;">Cena brutto, <br />w tym KGO 2,53zł</div> <div class="najczesciej" style="left: '+left_default+'px; top: '+top_najczesciej+'px;"><svg width="'+najczesciej_rect_width+'" height="'+najczesciej_rect_height+'"><rect width="'+najczesciej_rect_width+'" height="'+najczesciej_rect_height+'" style="fill:rgb(0,0,0);" /></svg><div class="najczesciej-text">NAJCZĘŚCIEJ KUPOWANE</div></div> <div class="ean" style="left: '+left_ean+'px; top: '+top_ean+'px; "><img src="" height="42" width="172"/></div> <div class="indeks" style=" top: '+top_indeks+'px;left: '+left_indeks+'px;"><%= gtin['+i+'] %></div> <div class="dodatkowe" style="top: '+top_dodatkowe+'px;left: '+left_default+'px;"><%= additional['+i+'] %></div></div></div>');
          }
        }

        /*
        if (labelNumber == 3) {
          // You can add more label types by adding if statements with corresponding number of label and creating a string for EJS template file, similar to the one above. Don't forget to add label option in select tag in the index.html file (in id="chooseLabelSection").
        }
        */

        //#endregion END OF Creating string for EJS template file based on received XML

        console.log(ejs_template);

        fs.writeFile(path.resolve(__dirname + '/views/eti') + '.ejs', ejs_template, req, res, function(err) {
          if(err) { console.log(err); return false }
          ejs2html(__dirname + "/views/eti.ejs", { 
            title: title,
            google_product_category: google_product_category,
            description: description,
            zlote: zlote,
            grosze: grosze,
            bestseller: bestseller,
            gtin: gtin,
            additional: additional
          }, req, res, options);
        });
    });
  }
});

app.get('/downloadPdf', function(req, res) {
  console.log("XXXXXXXXXXX" + saveDir + "YYYYYYYYYYYYYYYY");
  createPDF(req, res, options);
});

app.post('/register', function(req, res) {
  console.log("HELLO");
  // Code for saving data from register form in the database, etc.
  if (req.body.email &&
    req.body.username &&
    req.body.password &&
    req.body.passwordConf) {

    User.findOne({username: req.body.username}, function(err, dbUsername) {
      if(err) {
        console.log(err);
        return res.send("Sorry! There was an error, try again later.");
      }

      if(dbUsername) {
        console.log("This username is already taken");
        return res.send("This username is already taken");
      }

      // Check if there is already user with that email in the database
      User.findOne({email: req.body.email}, function(err, dbEmail) {
        if(err) {
          console.log(err);
          return res.send("Sorry! There was an error, try again later.");
        }

        if(dbEmail) {
          console.log("This email is already registered");
          return res.send("This email is already registered");
        }

        // If neither username nor email is in the database, add this user to the database
        var newUser = new User();
        newUser.email = req.body.email;
        newUser.username = req.body.username;
        newUser.password = req.body.password;
  
        newUser.save(function (err, savedUser){
          if(err){
            console.log(err);
            return res.send("Sorry! There was an error, try again later.");
          } else {
            res.send("Registration complete!");
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
  var username = req.body.username;
  var password = req.body.password;
  User.findOne({username: username}, function(err, user) {
    if(err) {
      console.log(err);
      return res.send("Sorry! There was an error, try again later.");
    }
    if(!user) {
      return res.send("There is no user with that username in the database.");
    }
    // test a matching password
    user.comparePassword(password, function(err, isMatch) {
      if (isMatch == true) {
        req.session.user = user;
        console.log(req.session);
        saveDir = path.resolve(__dirname + '/../../../user_files/' + user._id);
        //return res.status(200).send();
        return res.send("loggedIn");
        console.log("nic");
      } else {
        return res.send("Wrong password.");
      }
    });
  });
});

app.get('/logout', function(req, res) {
  req.session.destroy();
  saveDir = (path.resolve(__dirname + '/../../../uploaded_files'));
  return res.send("loggedOut");
});

app.get('/dashboard', function(req, res) {
  if (!req.session.user){
    return res.status(401).send();
  }

  return res.status(200).send("Welcome!");
});

app.listen(3000, function () {
	console.log('Serwer nasłuchuje na porcie numer', 3000);
});