var CONTAINERS_URL = '/api/Containers/';
var assert = require('assert');
var config = require('../../server/config.json');

module.exports = function(File) {
  File.upload = function (ctx,options,cb) {
    if(!options) options = {};
    ctx.req.params.container = 'images';
    File.app.models.Container.upload(ctx.req,ctx.result,options,function (err,fileObj) {
      if(err) {
        cb(err);
      } else {
        assert(fileObj && fileObj.files && fileObj.files.file[0], 'Problem in uploading');
        var fileInfo = fileObj.files.file[0];
        File.create({
          name: fileInfo.name,
          type: fileInfo.type,
          url: 'http://' + config.host + ':' + config.port +'/client/files/'+ctx.req.params.container+'/'+fileInfo.name
        },function (err,obj) {
          if (err) {
            cb(err);
          } else {
            cb(null, obj);
          }
        });
      }
    });
  };

  File.remoteMethod(
    'upload',
    {
      description: 'Uploads a file',
      accepts: [
        { arg: 'ctx', type: 'object', http: { source:'context' } },
        { arg: 'options', type: 'object', http:{ source: 'query'} }
      ],
      returns: {
        arg: 'fileObject', type: 'object', root: true
      },
      http: {verb: 'post'}
    }
  );

};
