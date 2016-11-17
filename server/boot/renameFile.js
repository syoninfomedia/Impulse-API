var assert = require('assert');
module.exports = function(app) {

  //Function for checking the file type..
  app.dataSources.storage.connector.getFilename = function(file, req, res) {
    //Return the new FileName
    assert(file && file.name, "File can't be upload");
    var name = 'FILE' + new Date().getTime();
    if (file && file.name) {
      return name+'.'+file.name.split(".")[file.name.split(".").length-1];
    }
  }
}//exports
