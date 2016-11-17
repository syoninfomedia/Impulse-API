module.exports = {
  replaceEmailTemplateKeys : function(obj, template) {
    if (obj && template) {
      for (var i in obj) {
        if (template.indexOf('{{'+ i +'}}') > -1 ) {
          for (j=0;j<10;j++)
          template = template.replace('{{'+ i +'}}', obj[i]);
        }
      }
    }
    return template;
  }
};
