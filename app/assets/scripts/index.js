$(document).ready(function(){

  $.ajax({
    type: "GET",
    url: "http://localhost:3000/isSessionActive",
    contentType: "application/json",
    success: function(data){
      if(data == 1) {
        $('.logout__button').css('display', 'block');
        $('.login-button').hide();
      } else {
        $('.login-button').css('display', 'block');
        //$('.login-button').css('display', 'block');
      }
    }
  });

  $("#registerForm__button").click(function(){
    var form = $("#registerForm");
    var url = form.attr("action");
    var formData = {};
    $(form).find("input[name]").each(function (index, node) {
      formData[node.name] = node.value;
    });
    $.ajax({
      type: "POST",
      url: url,
      data: JSON.stringify(formData),
      contentType: "application/json",
      success: function(data){
          alert(data);
      }
    });
  });

  $("#loginForm__button").click(function(){
    var form = $("#loginForm");
    var url = form.attr("action");
    var formData = {};
    $(form).find("input[name]").each(function (index, node) {
      formData[node.name] = node.value;
    });
    $.ajax({
      type: "POST",
      url: url,
      data: JSON.stringify(formData),
      contentType: "application/json",
      success: function(data){
        if(data != "loggedIn") {
          alert(data);
        } else {
          $('.login-button').hide();
          $('.logout__button').css('display', 'block');
        }
      }
    });
  });

  $(".logout__button").click(function(){
    $.ajax({
      type: "GET",
      url: "http://localhost:3000/logout",
      contentType: "application/json",
      success: function(data){
        if(data == "loggedOut") {
          $('.login-button').css('display', 'block');
          $('.logout__button').hide();
        }
      }
    });
  });


  $("#labelNumber").change(function(){
    var form = $("#labelNumberForm");
    var url = form.attr("action");
    var formData = {"labelNumber" : $("#labelNumber").val(), 
                    "documentWidth" : window.screen.width};
    $.ajax({
      type: "POST",
      url: url,
      data: JSON.stringify(formData),
      contentType: "application/json",
      success: function(data){
          $("#labelNumber__downloadButton").show();
          $("#labels").remove();
          $("body").append(data);
      }
    });
  });

  $('#loginForm').keyup(function (key) {
    if(key == 13)  // the enter key code
     {
       $("#loginForm__button").click();
       return false;  
     }
   });   

  $("#labelNumber__downloadButton").click(function(){
    $("#darkenScreen").addClass("darkenScreen--active").removeClass("darkenScreen--deactive");
    $("#darkenScreen__loader").addClass("darkenScreen__loader");
    $("#labelNumber__downloadButton").attr("disabled", true);
    $("#labelNumber").attr("disabled", true);
    $.ajax({
      type: "GET",
      url: "http://localhost:3000/downloadPdf",
      contentType: "application/json",
      success: function(data){
        $("#darkenScreen").addClass("darkenScreen--deactive").removeClass("darkenScreen--active");
        $("#darkenScreen__loader").removeClass("darkenScreen__loader");
        $("#labelNumber__downloadButton").attr("disabled", false);
        $("#labelNumber").attr("disabled", false);
        //alert(JSON.stringify(data));
        if (data.user){
          var pdfId = data.user + data.pdfName;
          var pdfLocation = data.user + "/pdf/" + data.pdfName;
        } else {
          var pdfId = data;
          var pdfLocation = data;
        }
        $("body").append('<a id="'+pdfId+'" href='+pdfLocation+'.pdf style="display:none;" download></a>');
        $('#'+pdfId).get(0).click();
      }
    });
  });

  $("#uploadSection__button").click(function(){
    //alert($("uploadFromDisk")[0])
    var file = $("#uploadFromDisk")[0].files[0];
    var upload = new Upload(file);
    //$("#progressWrp").css('display', 'block');

    upload.doUpload();
  });

  var Upload = function (file) {
      this.file = file;
  };
  
  Upload.prototype.getType = function() {
    return this.file.type;
  };
  Upload.prototype.getSize = function() {
      return this.file.size;
  };
  Upload.prototype.getName = function() {
      return this.file.name;
  };
  
  Upload.prototype.doUpload = function () {
      var that = this;
      var formData = new FormData();

      // add assoc key values, this will be posts values
      if(this.file){
        formData.append("uploadFromDisk", this.file, this.getName());
        formData.append("upload_file", true);
      }
      formData.append("uploadFromUrl", $("#uploadFromUrl").val());
      //formData.append("uploadFromDisk", "");
      

      $.ajax({
          type: "POST",
          url: "http://localhost:3000/upload",
          xhr: function () {
              var myXhr = $.ajaxSettings.xhr();
              if (myXhr.upload) {
                  myXhr.upload.addEventListener('progress', that.progressHandling, false);
              }
              return myXhr;
          },
          success: function (data) {
            if(data != "fileUploaded") {
              alert(data);
            } else {
              $("#uploadSection").hide();
              $("#chooseLabelSection").show();
              //$('.login-button').hide();
              //$('.logout__button').css('display', 'block');
            }
          },
          error: function (error) {
              // handle error
          },
          async: true,
          data: formData,
          cache: false,
          contentType: false,
          processData: false,
          timeout: 60000
      });
  };

  Upload.prototype.progressHandling = function (event) {
      var percent = 0;
      var position = event.loaded || event.position;
      var total = event.total;
      var progress_bar_id = "#progressWrp";
      if (event.lengthComputable) {
          percent = Math.ceil(position / total * 100);
      }
      // update progressbars classes so it fits your code
      $(progress_bar_id + " .progressBar").css("width", +percent + "%");
      $(progress_bar_id + " .status").text(percent + "%");
  };

});