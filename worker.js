/**
 * Hoodie plugin ifcontrol-importer
 * An example plugin worker, this is where you put your backend code (if any)
 */

var fs = require('fs');
var path = require('path');
var crypt = require('crypto');

module.exports = function (hoodie, callback) {

  // listen to user create
  //   look in assets dir,
  //   if folder == username
  //     lead assets
  //   else // optional
  //     try again in 5 minutes

  var fixtureDir = '/tmp/ifcontrol';

  var importFixtures = function importFixtures(user) {
    console.log('import for ', user.hoodieId);
    var assetDir = path.join(fixtureDir, user.name.split('/')[1]);

    var userDbName = 'user/' + user.hoodieId;
    var db = hoodie.database(userDbName);

    var importAsset = function importAsset(asset) {
      console.log('import asset', asset);
      var getType = function getType(assetName) {
        return assetName.match(/[^_]+_([^.]+).json/)[1];
      };

      var getId = function getId(assetData) {
        var hash = crypt.createHash('sha256');
        hash.update(assetData);
        return hash.digest('hex');
      };

      var assetPath = path.join(assetDir, asset);
      var assetData = fs.readFileSync(assetPath);
      var assetJSON = JSON.parse(assetData);
      assetJSON.id = getId(assetData);

      db.add(getType(asset), assetJSON, function (error) {
        if (error) {
          console.log('error importing asset', asset);
          throw new Error(error);
        }
        console.log('asset imported: ', asset);
        // done! Yay
      });
    };

    // if fixtureDir + username exists
    //   load assets
    if (!fs.existsSync(assetDir)) {
      console.log('bail: testDir');
      return;
    }

    var assets = fs.readdirSync(assetDir);
    console.log(assets);
    assets.forEach(importAsset);
    console.log('done importing all assets', assets);
  };



  var handleUserChange = function handleUserChange(userDoc) {

    if (userDoc.$error) {
      // we don’t care about error users
      console.log('bail: error');
      return;
    }

    if (userDoc._deleted && !userDoc.$newUsername) {
      // we don’t care about deleted users
      console.log('bail: deleted');
      return;
    }

    if (userDoc.$newUsername) {
      // we don’t care about username changes
      console.log('bail: rename');
      return;
    }

    var isConfirmed = function isConfirmed(doc) {
      return doc.roles.indexOf('confirmed') !== -1;
    };

    if (!isConfirmed(userDoc)) {
      // we don’t care about unconfirmed users
      console.log('bail: unconfirmed');
      return;
    }

    // now we should have a genuine new user ready to go.
    importFixtures(userDoc);
  };


  hoodie.account.on('user:change', handleUserChange);
  // setup done
  callback();
};
