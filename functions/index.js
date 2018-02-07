const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database. 
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// List all the posts under the path /posts/
// once() is a database action that triggers data retrieval one time. In our code, we want the value event. 
// The value event is sent every time data is changed at or below the reference specified in the ref() call. 
// Because every data change will trigger the value event, use it sparingly.
exports.posts = functions.https.onRequest((req, res) => {
  return admin.database().ref('/posts')
    .once('value')
    .then((snapshot) => {
      return res.status(200).send(JSON.stringify(snapshot));
    });
});