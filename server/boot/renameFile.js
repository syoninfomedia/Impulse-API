module.exports = function(app) {

  //Function for checking the file type..
  app.dataSources.storage.connector.getFilename = function(file, req, res) {
  	var name = "FILE"+new Date().getTime();
    var extension = '.jpg';
    var fileType = null;
     //Return the new FileName
      if (file && file.type) {
        fileType = file.type.split('/');
        if (fileType && fileType.length == 2) {
          extension = "."+fileType[1];
        }
      }
     return name+extension;
 }

}
