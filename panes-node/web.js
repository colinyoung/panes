// == Start config ==
Config = {
  db: {
    host: "127.0.0.1",
    port: 27017,
    name: "panes"
  }
};
// == Stop config ==

var express = require('express');

var app = express.createServer(express.logger());

app.register('.html', require('jade'));
app.use(express.static(__dirname + '/public'));

// == Collections ==
var Pane = require('./models/pane').Pane;

// == Routes ==
app.get('/:key/:url', function(request, response) {
  
  Pane.where({url: request.params['url']}, function(err, docs) {
  
    response.send({
      "panes" : docs,
      "status" : {
        "code" : !err ? 200 : 500,
        "resource" : request.params["url"],
        "cache_for" : 172800
      }
    });
  
  });
  
});

app.get('/iframe', function(req, res) {
  res.render('iframe.jade', {layout: false});
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});