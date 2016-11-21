var express = require('express')
  , http = require('http')
  , app = express()
  , server = http.createServer(app)


server.listen(3010,'192.168.0.49',function(){
  server.close(function(){
    server.listen(3010,'192.168.0.49')
  })
})
