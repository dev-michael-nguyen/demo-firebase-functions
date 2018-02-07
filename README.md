Install firebase-tools
> ```npm i -g firebase-tools```

Firebase Login
> ```firebase login```

Init Cloud Functions to Firebase
> ```firebase init functions```

Edit functions/index.js

Create a new project alias and set as active project for this working directory
> ```firebase use --add```

Start local server
> ```firebase serve --only functions```

Deploy to Firebase
> ```firebase deploy --only functions```
