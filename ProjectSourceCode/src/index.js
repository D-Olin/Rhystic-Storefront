// ----------------------------------   DEPENDENCIES  ----------------------------------------------
const express = require('express');
const app = express();
const path = require('path');
const handlebars = require('express-handlebars');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');

// -------------------------------------  APP CONFIG   ----------------------------------------------


// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
    extname: 'hbs',
    layoutsDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials',
  });
  
  // Register `hbs` as our view engine using its bound `engine()` function.
  app.engine('hbs', hbs.engine);
  app.set('view engine', 'hbs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(bodyParser.json());
  // set Session
  app.use(
    session({
      secret: process.env.SESSION_SECRET,
    })
  );
  app.use(
    bodyParser.urlencoded({
      extended: true,
    })
  );

  app.use('/', express.static(path.join(__dirname, 'resources')));
  
  // -------------------------------------  DB CONFIG AND CONNECT   ---------------------------------------
const dbConfig = {
    host: 'db',
    port: 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  };
  const db = pgp(dbConfig);
  
  // db test
db.connect()
  .then(obj => {
    // Can check the server version here (pg-promise v10.1.0+):
    console.log('Database connection successful');
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR', error.message || error);
  });



// -------------------------------------  ROUTES for home.hbs   ----------------------------------------------


app.get('/', (req, res) => {
  res.render('pages/home');
});


// -------------------------------------  ROUTES for store.hbs   ----------------------------------------------


app.get('/store/search', (req, res) => {
  var search_query = req.query.q;
  var api_call = 'https://api.scryfall.com/cards/search?q=' + search_query + '+unique:prints+(game:paper)';
  console.log(api_call);

  const scryfallRes = fetch(api_call, {method: "GET"})
    .then((response) => response.json())
    .then((json) => res.render('pages/store', {json, search_query}));

});

/* app.post('/store/search/add', (req, res) => {
  
}); */


// -------------------------------------  START THE SERVER   ----------------------------------------------

app.listen(3000);
console.log('Server is listening on port 3000');