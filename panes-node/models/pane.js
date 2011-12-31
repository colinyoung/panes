var Connection = require('../connection').Connection;

var Pane = function() {
  this.collection = Pane.collection;
}

Pane.protoype = {
  collection: null,
  collection_name: "panes"
};

Pane.where = function(criteria, callback) {
  this.collection.find(criteria).toArray(callback);
}

Pane.all = function(callback) {
  this.collection.find({}).toArray(callback);
}

Pane.find = function(criteria, callback) {
  this.collection.find(criteria, {limit: 1}).nextObject(callback);
}

Pane.findByURL = function(URL, callback) {
  this.collection.find({url: URL}, {limit: 1}).nextObject(callback);
}

new Connection("panes", function(collection) {
  console.log('Connected!');
  Pane.collection = collection;
});

exports.Pane = Pane;