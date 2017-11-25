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