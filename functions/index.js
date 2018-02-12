// Using Firebase Admin SDK to access Firebase Realtime Database.
// NOTE: It will be initialized with default admin privilege and bypass database rule.
//       Config with service account as needed: https://firebase.google.com/docs/admin/setup?authuser=0
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

// Res status cheatsheet
const resStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};

// Use on route that need to be authenticated
const authenticate = (req, res, next) => {
  // Set CORS our POST response so it worked on codepen
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    return res.status(resStatus.UNAUTHORIZED).json({ error: `${resStatus.UNAUTHORIZED}: No authorization header.`});
  }

  const idToken = req.headers.authorization.split('Bearer ')[1];
  return admin.auth().verifyIdToken(idToken)
    .then((decodedUser) => {
      req.user = decodedUser;
      return next();
    })
    .catch((error) => {
      console.error(error);
      return res.status(resStatus.UNAUTHORIZED).json({ error: `${resStatus.UNAUTHORIZED}: ${error.message}`});
    });
};

// Public route
app.get(
  ['/posts/', '/posts/:id'],
  (req, res) => {
    return db.ref(req.fullPath)
      .once('value')
      .then((snapshot) => {
        const data = snapshot.val();
        return res.status(resStatus.OK).json(data);
      })
      .catch((error) => {
        console.error(error);
        return res.status(resStatus.SERVER_ERROR).json({ error: `${error.code}: ${error.message}`});
      });
  }
);

// For sanitizing POST request
const sanitizeHtml = require('sanitize-html');
// Protected route
app.post(
  ['/posts/'],
  authenticate,
  (req, res) => {
    const content = req.body.content ? sanitizeHtml(req.body.content) : null;
    const title = req.body.title ? sanitizeHtml(req.body.title) : null;
    if (content === null || title === null) {
      return res.status(resStatus.BAD_REQUEST).json({ error: `${resStatus.BAD_REQUEST}: Invalid content or title`});
    }

    const newPost = {
      author: {
        uid: req.user.uid,
      },
      title: title,
      content: content,
      created: admin.database.ServerValue.TIMESTAMP
    }

    return db.ref(req.fullPath)
      // push return https://firebase.google.com/docs/reference/node/firebase.database.ThenableReference
      .push(newPost) 
      .then((dbRef) => {
        return dbRef.ref.once('value');
      })
      .then((snapshot) => {
        const data = snapshot.val();
        data.key = snapshot.key;
        return res.status(resStatus.CREATED).json(data);
      })
      .catch((error) => {
        console.error(error);
        return res.status(resStatus.SERVER_ERROR).json({ error: `${error.code}: ${error.message}`});
      });
  }
);

// Set routes under 'app' function base url which is /app
// Set up Firebase Realtime Database base url to /app for easy integration
exports.app = functions.https.onRequest((req, res) => {
  // Fix routing for empty req path
  if (!req.path) {
    req.url = `/${req.url}`;
  }

  // Save the full path so we can use them for Firebase Realtime Database ref
  // NOTE: If database baseUrl is not the same as our function then config it here
  const dbBaseUrl = 'app';
  req.fullPath = `${dbBaseUrl}${req.url}`;

  return app(req, res);
});