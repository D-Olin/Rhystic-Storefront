require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');
const handlebars = require('express-handlebars');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');

// -------------------------------------  APP CONFIG   ----------------------------------------------

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
    extname: 'hbs',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),
    helpers: {
        ifEquals: function(arg1, arg2, options) { return (arg1 == arg2) ? options.fn(this) : options.inverse(this); },
        ifNotEquals: function(arg1, arg2, options) { return (arg1 != arg2) ? options.fn(this) : options.inverse(this); }
    }
});

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// set Session
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
    })
);

app.use('/', express.static(path.join(__dirname, 'resources')));

// -------------------------------------  DB CONFIG AND CONNECT   ---------------------------------------
const dbConfig = {
    host: process.env.DB_HOST || 'db',
    port: process.env.DB_PORT || 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
};
console.log('Database configuration:', dbConfig);
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

// -------------------------------------  ROUTES for login.hbs   ----------------------------------------------

// Serve login page
app.get('/login', (req, res) => {
    res.render('pages/login');
});

// Handle user login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await db.one('SELECT * FROM userinfo WHERE username = $1', [username]);

        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = user;
            res.redirect('/profile');
        } else {
            res.redirect('/login');
        }
    } catch (err) {
        console.error('Error logging in user:', err);
        res.status(401).send({error: 'Error logging in user'});
        //res.redirect('/login');
    }
});

// -------------------------------------  ROUTES for signup.hbs   ----------------------------------------------

// Serve signup page
app.get('/signup', (req, res) => {
    res.render('pages/signup');
});

// Handle user registration
app.post('/signup', async (req, res) => {
    const { name, username, email, password } = req.body;
    console.log('Received data:', { name, username, email, password });
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await db.none(
            'INSERT INTO userinfo (name, username, email, password) VALUES ($1, $2, $3, $4)',
            [name, username, email, hashedPassword]
        );
        console.log('User successfully inserted');
        res.redirect('/login');
    } catch (err) {
        console.error('Error inserting user:', err);
        res.status(400).send({error: 'Error inserting user'});
        //res.status(400).redirect('/signup');
    }
});


// -------------------------------------  ROUTES for logout.hbs   ----------------------------------------------

// Handle user logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/profile');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// -------------------------------------  ROUTES for profile.hbs   ----------------------------------------------
app.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    db.any('SELECT * FROM cardinfo ci JOIN user_to_card utc ON ci.card_id = utc.card_id WHERE utc.user_id = $1', [req.session.user.user_id])
        .then(cards => {
            res.render('pages/profile', {
                user: req.session.user,
                card: cards
            });
        })
        .catch(err => {
            console.log(err);
        });
});

// -------------------------------------  ROUTES for store.hbs   ----------------------------------------------
app.get('/store/search', (req, res) => {
    var search_query = req.query.q;
    var search_query_no_space = search_query.replaceAll(" ", "-");

    var sort_by = req.query.sort_by;
    var sort_dir = req.query.dir;
    var api_call;
    if (sort_by != null && sort_dir != null) {
        api_call = 'https://api.scryfall.com/cards/search?q=' + search_query_no_space + '+unique:prints+(game:paper)' + '&order=' + sort_by + '&dir=' + sort_dir;
    } else {
        api_call = 'https://api.scryfall.com/cards/search?q=' + search_query_no_space + '+unique:prints+(game:paper)';
    }

    console.log(api_call);

    fetch(api_call, { method: "GET" })
        .then((response) => response.json())
        .then((json) => res.render('pages/store', { json, search_query, sort_by, sort_dir }));
});

// -------------------------------------  ADDITIONAL ROUTES   ----------------------------------------------
app.get('/welcome', (req, res) => {
    res.json({ status: 'success', message: 'Welcome!' });
});

// Export the app for testing purposes
module.exports = {app, db};
