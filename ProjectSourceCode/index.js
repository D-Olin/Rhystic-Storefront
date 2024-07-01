// ----------------------------------   DEPENDENCIES  ----------------------------------------------
const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');

// -------------------------------------  APP CONFIG   ----------------------------------------------

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
    extname: 'hbs',
    layoutsDir: __dirname + './views/pages',
    partialsDir: __dirname + './views/partials',
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
        saveUninitialized: true,
        resave: true,
    })
    );  
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

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


// -------------------------------------  ROUTES for login.hbs   ----------------------------------------------
const user = {
    user_id: undefined,
    username: undefined,
    name: undefined,
    email: undefined
};

const user_cards = `
    SELECT DISTINCT
        cardinfo.card_id,
        cardinfo.name,
        cardinfo.discription,
        cardinfo.image_url,
        cardinfo.rarity,
        cardinfo.cost,
        user_to_card.card_count,
        userinfo.user_id
    FROM
        cardinfo
        JOIN user_to_card ON cardinfo.card_id = user_to_card.card_id
        JOIN userinfo ON user_to_card.user_id = userinfo.user_id
    WHERE userinfo.user_id = $1
    ORDER BY cardinfo.card_id ASC;`;

const all_cards = `
    SELECT
        cardinfo.card_id,
        cardinfo.name,
        cardinfo.discription,
        cardinfo.image_url,
        cardinfo.rarity,
        cardinfo.cost
        CASE
        WHEN
        cardinfo.card_id IN (
            SELECT user_to_card.card_id
            FROM user_to_card
            WHERE user_to_card.card_count > 0
        ) THEN TRUE
        ELSE FALSE
        END
        AS "bought"
    FROM
        courses
    ORDER BY cardinfo.card_id ASC;
    `;

app.get('/login', (req, res) => {
res.render('pages/login');
});

  // Login submission
app.post('/login', (req, res) => {
    const email = req.body.email;
    const username = req.body.username;
    const query = 'select * from userinfo where userinfo.email = $1 LIMIT 1';
    const values = [email];

    // get the user_id based on the emailid
    db.one(query, values)
        .then(data => {
        user.user_id = data.user_id;
        user.username = username;
        user.name = data.name;
        user.email = data.email;

        req.session.user = user;
        req.session.save();

        res.redirect('/');
    })
    .catch(err => {
        console.log(err);
        res.redirect('/login');
    });
});

  // Authentication middleware.
const auth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

app.use(auth);



// -------------------------------------  ROUTES for home.hbs   ----------------------------------------------

app.get('/', (req, res) => {
    res.render('pages/home', {
        username: req.session.user.username,
        name: req.session.user.name,
        email: req.session.user.email,
    });
});

// -------------------------------------  ROUTES for invnentory.hbs   ----------------------------------------------




// -------------------------------------  ROUTES for logout.hbs   ----------------------------------------------

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.render('pages/logout');
});

  // -------------------------------------  START THE SERVER   ----------------------------------------------

app.listen(3000);
console.log('Server is listening on port 3000');

