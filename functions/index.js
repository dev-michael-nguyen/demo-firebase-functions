// Using Firebase Admin SDK to access the Firebase Realtime Database.
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const db = admin.database();

// Using Express App for routing
const express = require('express');
const app = express();

// Enable CORS on app request
const cors = require('cors')({origin: true});
app.use(cors);

// Middleware for request authentication
app.use((req, res, next) => {
  // Set CORS on our response
  // Enable and test this if we have problem with CORS on codepen
  // res.header("Access-Control-Allow-Origin", "*");
  // res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    res.status(403).send('Unauthorized: No authorization header.');
    return;
  }

  const idToken = req.headers.authorization.split('Bearer ')[1];
  admin.auth().verifyIdToken(idToken)
    .then((decodedUser) => {
      req.user = decodedUser;
      return next();
    })
    .catch((error) => {
      console.error(error);
      res.status(403).send('Unauthorized: ' + error.message);
    });
});

app.get(
  ['/posts/', '/posts/:id'], 
  (req, res) => {
    // once() is a database action that triggers data retrieval one time. In our code, we want the value event. 
    // The value event is sent every time data is changed at or below the reference specified in the ref() call. 
    // Because every data change will trigger the value event, use it sparingly.
    return db
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