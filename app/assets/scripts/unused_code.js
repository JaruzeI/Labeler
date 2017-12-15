//#region Converting XML to js object
var parser = new xml2js.Parser();
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

//#endregion END OF Converting XML to js object

//Below is code that I wrote to try to wait for creating eti.ejs.html file until I try to read it to convert it to pdf. It doesn't work for some reason...

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
      

// Rendering ejs template with XML data
function render_preview() {
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

//#endregion END OF Unused code


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
        var ejs_template = '<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <meta http-equiv="X-UA-Compatible" content="ie=edge"> <title>Etykieta</title><link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" /><script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script><script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script><style> body { font-family:"Arial"; font-size:6px; color:black; margin-top:30px; } div { position: absolute; width: 189px; } .marka { text-transform:uppercase; text-align:left; font-size: 13px; height: 15px; font-weight: 192; } .typ { text-transform:uppercase; text-align:left; font-size: 8px; height: 15px; font-weight: 600; } .opis { position: absolute; font-weight:normal; line-height:10px; text-align:left; left: 12px; top: 38px; font-size:7px; width: 189px; } .gr { font-size: 22px; font-weight: 168; } .zl { margin-left:12px; line-height:30px; font-size:36px; font-weight: 168; text-align: right; } .kgo { height: 6px; font-size: 5px; color:black; } .najczesciej { border: 2px solid red; height: 12px; background: black; color: white; display: inline-block; font-weight: 600; } .najczesciej-text { left: 17px; top: 10px; } .ean { height: 8px; } </style> </head> <body>';
      
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

//#region SOCKET.IO section
//var server = require('http').createServer(app);
//var io = require('socket.io')(server);

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

server.listen(3000);
//#endregion END OF SOCKET.IO section