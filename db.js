var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

var url = 'mongodb://localhost:27017/test';

module.exports = {
  connect: function() {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      console.log("Connected correctly to server.");
      db.close();
    });
  },
  saveTeamName: (title) => {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      console.log("Inserting team name.");

      db.collection('teams').insertOne( {
        "name": title
      });

      db.close();
    });

  }
};
