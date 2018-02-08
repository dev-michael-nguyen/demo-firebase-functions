// Using Firebase Admin SDK to access the Firebase Realtime Database. 
const admin = require('firebase-admin');
const functions = require('firebase-functions');
admin.initializeApp(functions.config().firebase);

// Using Express App for routing
const express = require('express');
const app = express();

// Enable CORS on app
const cors = require('cors')({origin: true});
app.use(cors);
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get(
  ['/posts/', '/posts/:id'], 
  (req, res) => {
    // once() is a database action that triggers data retrieval one time. In our code, we want the value event. 
    // The value event is sent every time data is changed at or below the reference specified in the ref() call. 
    // Because every data change will trigger the value event, use it sparingly.
    return admin.database()
      .ref(req.fullPath)
      .once('value')
      .then((snapshot) => {
        const response = Object.assign({}, snapshot.val());
        return res.status(200).send(response);
      });
  }
);

// Set the routes up under the /posts endpoint
exports.app = functions.https.onRequest((req, res) => {
  // Handle routing of /posts without a trailing /
  if (!req.path) {
    req.url = `/${req.url}`;
  }

  // Save the full path so we can use them for firebase database ref
  req.fullPath = `app${req.url}`;

  return app(req, res);
});