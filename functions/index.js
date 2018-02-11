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

// For sanitizing POST request
const sanitizeHtml = require('sanitize-html');
const resStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};

// Middleware for request authentication
app.use((req, res, next) => {
  // Set CORS on our response
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    res.status(resStatus.UNAUTHORIZED).json({ error: `${resStatus.UNAUTHORIZED}: No authorization header.`});
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
      return res.status(resStatus.UNAUTHORIZED).json({ error: `${resStatus.UNAUTHORIZED}: ${error.message}`});
    });
});

app.get(
  ['/posts/', '/posts/:id'], 
  (req, res) => {
    return db.ref(req.fullPath)
      .orderByChild('created')
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

app.post(
  ['/posts/'],
  (req, res) => {
    const content = req.body.content ? sanitizeHtml(req.body.content) : null;
    const title = req.body.title ? sanitizeHtml(req.body.title) : null;
    if (content === null || title === null) {
      return res.status(resStatus.BAD_REQUEST).json({ error: `${resStatus.BAD_REQUEST}: Invalid content or title`});
    }

    const newPost = {
      author: {
        uid: req.user.uid,
        name: req.user.name,
      },
      title: title,
      content: content,
      created: admin.database.ServerValue.TIMESTAMP
    }

    return db.ref(req.fullPath)
      .push(newPost) // push return https://firebase.google.com/docs/reference/node/firebase.database.ThenableReference
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

// Set the routes up under the /app endpoint
exports.app = functions.https.onRequest((req, res) => {
  // Handle routing of /app without a trailing /
  if (!req.path) {
    req.url = `/${req.url}`;
  }

  // Save the full path so we can use them for firebase database ref
  req.fullPath = `app${req.url}`;

  return app(req, res);
});