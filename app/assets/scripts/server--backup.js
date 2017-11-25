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
var User = require('./models/register');
//#endregion END OF Declaring modules

// options is a variable used by html-pdf module
var options = { "height": "3508px", "width": "2408px", "dpi": "200" };
var saveDir = "";

const app = express();
app.use(fileUpload());
app.use(bodyParser.json());
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
function ejs2html(path, information) {
    fs.readFile(path, 'utf8', function (err, data) {
        if (err) { console.log(err); return false; }
        var ejs_string = data,
            template = ejs.compile(ejs_string),
            html = template(information);
        fs.writeFile(path + '.html', html, function(err) {
            if(err) { console.log(err); return false }
            return true;
        });  
    });
}

// Function for creating pdf file from html
function createPDF() {
  fs.readFile(path.resolve(__dirname + '/views/eti.ejs.html'), 'utf8', function (err, data) {
    pdf.create(data, options).toFile(path.resolve(__dirname + '/../../../uploaded_files/pdf/etykiety.pdf'), function(err, res) {
      if (err) return console.log(err);
      console.log(res);
    });
    
  });
}
//#endregion END OF Declaring functions
 
app.get('/', function (req, res) {
  res.sendFile(path.resolve(__dirname + '/../../index.html'));
});

app.post('/upload', function(req, res) {
  var uploadFromUrl = req.body.uploadFromUrl, uploadFromDisk = req.files.uploadFromDisk;
  
  //console.log(uploadFromUrl);
  //console.log(uploadFromDisk.data.toString('utf-8'));

  // Checking if both of the upload options aren't empty.
  if (!uploadFromDisk && !uploadFromUrl)
    return res.status(400).send('Please choose one of the upload options');

  // Checking if both of the upload options aren't filled at the same time.
  if (uploadFromDisk && uploadFromUrl)
    return res.status(400).send('You cannot upload files from two upload options at the same time');
  
  //#region Saving uploaded file on the server
  // The name of the input field is used to retrieve the uploaded file.
  if (uploadFromDisk) {
    var uploadFromDisk = req.files.uploadFromDisk;
    saveDir = (path.resolve(__dirname + '/../../../uploaded_files/xml/fileFromDisk.xml'));

    // Use the mv() method to place the file somewhere on your server
    uploadFromDisk.mv(saveDir, function(err) {
      if (err) return res.status(500).send(err);
    });
  }

  if (uploadFromUrl) {
    saveDir = (path.resolve(__dirname + '/../../../uploaded_files/xml/fileFromUrl.xml'));

    download(uploadFromUrl, saveDir, function() {
      console.log('Upload from url successfull!');
    });
  }

  res.sendFile(path.resolve(__dirname + '/../../label-type.html'));

  //wybierz rodzaj etykiety (dropdown do wyboru / kafelki) + automatyczny podgląd po wyborze / kliknięciu + przycisk pobierz pdf

  //#endregion END OF Saving uploaded file on the server
});

app.post('/label', function(req, res) {
  // Operations on XML file
    fs.readFile(saveDir, function(err, data) {
      var xml_file = String(data);
      var title = [], google_product_category = [], description = [], price = [], bestseller = [], gtin = [], additional = [], zlote = [], grosze = [];
      var items_count, labelNumber = req.body.labelNumber;

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
        var ejs_template = '<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <meta http-equiv="X-UA-Compatible" content="ie=edge"> <title>Etykieta</title> <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" /> <style> body { font-family:"Arial"; font-size:25px; color:black; width: 2480px; height: 3508px; margin-top:125px; } div { position: absolute; width: 787px; } .marka { text-transform:uppercase; text-align:left; font-size: 55px; height: 62px; font-weight: 800; } .typ { text-transform:uppercase; text-align:left; font-size: 35px; height: 62px; font-weight: 600; } .opis { position: absolute; font-weight:normal; line-height:40px; text-align:left; left: 50px; top: 160px; font-size:30px; width: 787px; } .gr { font-size:92px; font-weight: 700; } .zl { margin-left:50px; line-height:125px; font-size:150px; font-weight: 700; text-align: right; } .kgo { height: 25px; font-size:22px; color:black; } .najczesciej { height: 50px; background: black; color: white; display: inline-block; font-weight: 600; } .najczesciej-text { left: 17px; top: 10px; } .ean { height: 135px; } </style> <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script> <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script> </head> <body>';
      
        // Creating variables for left and top allignment for elements in EJS template file
        var left_default = 50, left_gr = 700, left_zl = -140, left_ean = 450, left_indeks = 212, top_marka = 50, top_typ = 105, top_opis = 160, top_gr = 365, top_zl = 350, top_kgo = 410, top_najczesciej = 480, top_ean = 540, top_indeks = 600, top_dodatkowe = 652; 
  
        for (i=0; i<items_count; i++) {
          var item_num = i+1;
  
          // Setting values of the left attributes for items
          if (i % 3 == 0) {
            left_default = 50;
            left_gr = 700;
            left_zl = -140;
            left_ean = 450;
            left_indeks = 212;
          } else if (i % 3 == 1 || i % 3 == 2) {
            left_default = left_default + 800;
            left_gr = left_gr + 800;
            left_zl = left_zl + 800;
            left_ean = left_ean + 800;
            left_indeks = left_indeks + 800;
          }
  
          // Setting values of top attributes for items
          if (i % 3 == 0 && i != 0) {
            top_marka = top_marka + 700;
            top_typ = top_typ + 700;
            top_opis = top_opis + 700;
            top_gr = top_gr + 700;
            top_zl = top_zl + 700;
            top_kgo = top_kgo + 700;
            top_najczesciej = top_najczesciej + 700;
            top_ean = top_ean + 700;
            top_indeks = top_indeks + 700;
            top_dodatkowe = top_dodatkowe + 700;
          } 

          if (i == 1) {
            for (j=1; j<40; j++) {
              var x = 100*j;
              ejs_template = ejs_template + '<div style="position: absolute; width: 30px; left: '+x+'px; top: 0px;">'+x+'</div>';
            }
          }
  
          //Adding item with values from variables to the template
          ejs_template = (ejs_template + '<div class="item'+item_num+'"> <div class="marka" style="left: '+left_default+'px; top: '+top_marka+'px;"><%= title['+i+'] %></div> <div class="typ" style="left: '+left_default+'px;top: '+top_typ+'px;"><%= google_product_category['+i+'] %></div> <div class="opis" style="left: '+left_default+'px;top: '+top_opis+'px;"><%= description['+i+'] %></div> <div class="gr" style=" left: '+left_gr+'px;top: '+top_gr+'px; "><%= grosze['+i+'] %></div><div class="zl" style="left: '+left_zl+'px;top: '+top_zl+'px;"><%= zlote['+i+'] %></div> <div class="kgo" style="top: '+top_kgo+'px;left: '+left_default+'px;">Cena brutto, <br />w tym KGO 2,53zł</div> <div class="najczesciej" style="left: '+left_default+'px; top: '+top_najczesciej+'px;"><div class="najczesciej-text">NAJCZĘŚCIEJ KUPOWANE</div></div> <div class="ean" style="left: '+left_ean+'px; top: '+top_ean+'px; "><img src="file:///I:/Projects/eti/app/assets/images.png" height="42" width="172"/></div> <div class="indeks" style=" top: '+top_indeks+'px;left: '+left_indeks+'px;"><%= gtin['+i+'] %></div> <div class="dodatkowe" style="top: '+top_dodatkowe+'px;left: '+left_default+'px;"><%= additional['+i+'] %></div> </div>');
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
      fs.writeFile(path.resolve(__dirname + '/views/eti') + '.ejs', ejs_template, function(err) {
            if(err) { console.log(err); return false }
            return true;
        });  

      console.log(ejs_template);

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
      });
      //#endregion

      //#region Unused code
      //Below is code that I wrote to try to wait for creating eti.ejs.html file until I try to read it to convert it to pdf. It doesn't work for some reason...
      /*
      let renderEJS = function() {
        return new Promise(function(resolve, reject) {
          ejs2html(__dirname + "/views/eti.ejs", { 
            title: title,
            google_product_category: google_product_category,
            description: description,
            zlote: zlote,
            grosze: grosze,
            bestseller: bestseller,
            gtin: gtin,
            additional: additional
          });
          resolve("EJSrendered");
        });

      }

      let readRenderedEJS = function(message) {
        return new Promise(function(resolve, reject) {
          try {          
            fs.readFileSync(path.resolve(__dirname + '/views/eti.ejs.html'), 'utf8', function (err, data) {
              pdf.create(data, options).toFile(path.resolve(__dirname + '/../../../uploaded_files/pdf/etykiety.pdf'), function(err, res) {
                if (err) return console.log(err);
                console.log(res);
              });
            });
          } catch(e) {
            console.log("Waiting for file to be saved first")
          } finally {
            resolve(message + "RenderedFileRead");
          }
        });
      }

      renderEJS().then(function(result){
        return readRenderedEJS(result);
      }).then(function(result){
        console.log('finished' + result);
      });
      */

      // Rendering ejs template with XML data
      /*function render_preview() {
        res.render('eti', 
        { 
          title: title,
          google_product_category: google_product_category,
          description: description,
          zlote: zlote,
          grosze: grosze,
          bestseller: bestseller,
          gtin: gtin,
          additional: additional
        }); 
      }

        setTimeout(render_preview, 100);
      */
      //#endregion END OF Unused code
    });

  // Creating pdf file from html
  // It takes around 3 miliseconds to fill entire data to EJS template.
  setTimeout(createPDF, 1000);
  // Showing preview of the final pdf file in the browser

    if (req.body.action == "Preview")
    {
      res.sendFile(path.resolve(__dirname + '/../../../uploaded_files/pdf/etykiety.pdf'));
    } else if (req.body.action == "Download") {
      res.download(path.resolve(__dirname + '/../../../uploaded_files/pdf/etykiety.pdf'));
    }

  //#region Converting XML to js object
  /*var parser = new xml2js.Parser();
  fs.readFile(saveDir, function(err, data) {
      parser.parseString(data, function (err, result) {
          fs.writeFile(path.resolve(__dirname + '/../../../uploaded_files/json/file.json'), JSON.stringify(result), function(err){
            if(err) {
              return console.log(err);
            }

          console.log("JSON file was saved");
          });
          console.dir(result);
          //res.send("Here is your data converted to JSON: " + JSON.stringify(result));
      });
  });
  */
  //#endregion END OF Converting XML to js object
});

app.post('/register', function(req, res) {
  // Code for saving data from register form in the database, etc.
  if (req.body.email &&
    req.body.username &&
    req.body.password &&
    req.body.passwordConf) {
    var userData = {
      email: req.body.email,
      username: req.body.username,
      password: req.body.password,
      passwordConf: req.body.passwordConf,
    }
    //use schema.create to insert data into the db
    User.create(userData, function (err, user) {
      if (err) {
        return res.status(500).send();
      } else {
        return err;
        //return res.status(200).send();
      }
    });
  }
});

app.listen(3000, function () {
	console.log('Serwer nasłuchuje na porcie numer', 3000);
});