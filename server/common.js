module.exports = {
  replaceEmailTemplateKeys : function(obj, template) {
    if (obj && template) {
      for (var i in obj) {
        if (template.indexOf('{{'+ i +'}}') > -1 ) {
          template = template.replace('{{'+ i +'}}', obj[i]);
        }
      }
    }
    return template;
  }
};
