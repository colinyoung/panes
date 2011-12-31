var Connection = function(collection_name, callback) {
  var mongodb = require('mongodb');
  var server = new mongodb.Server(Config.db.host, Config.db.port, {});
  
  console.log('Mongo db connecting to `'+ Config.db.name + '` on ' + Config.db.host + ':' + Config.db.port + '...');  
  
  new mongodb.Db('test', server, {}).open(function (error, client) {
    if (error) throw error;
    var collection = new mongodb.Collection(client, 'test_collection');
    callback.apply(this, [collection]);
  });
}

exports.Connection = Connection;