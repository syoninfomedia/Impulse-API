module.exports = function(Container) {

  Container.beforeRemote('create', function(context, comment, next) {
    console.log('fuck');
    if (context.req.body.fileName.length < 7) {
      context.res.statusCode = 401;
      next(new Error('Filename is too short!'));
    } else {
      next();
    }
  });

};
