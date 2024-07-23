require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');
const handlebars = require('express-handlebars');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const axios = require('axios');

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
    if (!req.session.user) {
        return res.render('pages/home');
    }
    else{
        res.render('pages/home', {
            user: req.session.user,
        });
    }
});

// -------------------------------------  ROUTES for login.hbs   ----------------------------------------------

// Serve login page
app.get('/login', (req, res) => {
    res.render('pages/login', {user: req.session.user});
});

// Handle user login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await db.one('SELECT * FROM userinfo WHERE username = $1', [username]);

        if (user && (await bcrypt.compare(password, user.password))) {
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
    res.render('pages/signup', {user: req.session.user});
});

// Handle user registration
app.post('/signup', async (req, res) => {
    const { name, username, email, password } = req.body;
    console.log('Received data:', { name, username, email, password });
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const user = await db.any(
            `INSERT INTO userinfo (name, username, email, password) VALUES ($1, $2, $3, $4) RETURNING *;`,
            [name, username, email, hashedPassword]
        );
        
        req.session.user = user;

        console.log('User successfully inserted');
        // res.json({status: 200, message: 'Success'});
        res.redirect('/login');
    } 
    catch (err) {
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

// -------------------------------------  Auth Middleware   ---------------------------------------

// Middleware to check if the user is logged in
function isLoggedIn(req, res, next) {
    if (!req.session.user) {
      return res.status(401).send("You are not logged in");
    }
    next();
}
  

// -------------------------------------  ROUTES for profile.hbs   ----------------------------------------------
app.get('/profile', isLoggedIn, (req, res) => {
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

// -------------------------------------  ROUTES for cart.hbs   ----------------------------------------------

app.get('/cart',async(req,res)=> {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    try{
        const cards = await db.any('SELECT ci.*,t.trade_quantity,t.trade_id FROM cardinfo ci JOIN trade t ON ci.card_id = t.card_id WHERE trade_id IN (SELECT unnest(cart) FROM userinfo ui WHERE ui.user_id = $1)', [req.session.user.user_id]);
        const user = await db.one('SELECT * FROM userinfo WHERE user_id = $1', [req.session.user.user_id]);

        res.render('pages/cart', {
            user,
            card:cards
        });
    }
    catch(err) {
        console.log(err);
    };
});

app.post('/cart/remove', async (req,res)=>{
    const{user_id,trade_id}=req.body
    try{
        await db.oneOrNone('UPDATE userinfo SET cart=array_remove(cart, $1) WHERE user_id = $2;',[trade_id,user_id]);
        await db.oneOrNone('DELETE FROM trade WHERE trade_id = $1',[trade_id]);
    }
    catch (err) {
        console.log(err)
    }
    return res.redirect('/cart');
});

app.post('/cart/buy', async(req,res)=>{
    const{totalPrice,user_id,trade_id,card_id,trade_quantity}=req.body
    try{
        await db.oneOrNone('INSERT INTO user_to_card (user_id,card_id,owned_count) VALUES ($1,$2,$4) ON CONFLICT (user_id,card_id) DO UPDATE SET owned_count= user_to_card.owned_count+$4::INT  WHERE (user_to_card.user_id=$1) AND (user_to_card.card_id=$2)',[user_id,card_id,trade_id,trade_quantity]);
        await db.oneOrNone('DELETE FROM trade WHERE trade_id = $1',[trade_id]);
        await db.oneOrNone('UPDATE userinfo SET cart=array_remove(cart, $1), money=userinfo.money-$3::DECIMAL WHERE user_id = $2;',[trade_id,user_id,totalPrice]);
    }
    catch (err) {
        console.log(err)
    }
    return res.redirect('/cart');
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
        .then((json) => res.render('pages/store', { json, search_query, sort_by, sort_dir, user: req.session.user}));
});

app.post('/store/search/add', isLoggedIn, (req, res) => {
    
});

// -------------------------------------  ROUTES for trade.hbs   ----------------------------------------------

// Route to display the trade page
app.get('/trade', isLoggedIn, (req, res) => {
  db.any(`SELECT trade.trade_id, trade.trade_quantity, trade.trade_price, cardinfo.card_name, userinfo.username AS seller_name 
    FROM trade 
    JOIN cardinfo ON trade.card_id = cardinfo.card_id 
    JOIN user_to_trade ON trade.trade_id = user_to_trade.trade_id 
    JOIN userinfo ON user_to_trade.seller_id = userinfo.user_id;`)
    .then(trades => {
      res.render('pages/trade', { trades, user: req.session.user });
    })
    .catch(error => {
      console.log(error);
      res.send('Error');
    });
});

// Route to create a new trade
app.post('/trade/create', isLoggedIn, async (req, res) => {
    //TODO: Select cards from inventory instead of searching by card id
  var card_id, card_name, card_price;
    await axios({
        url: `https://api.scryfall.com/cards/named`,
        method: 'GET',
        dataType: 'json',
        params: {
          fuzzy: req.body.card_name
        },
      })
        .then(card => {
          console.log(card.data);
          card_id = card.data.id;
          card_name = card.data.name;
          card_price = card.data.prices.usd;
          console.log(card_id);
        })
        .catch(error => {
          console.error(error);
          return res.status(401).send("Error querying for card.");
        });
        
    console.log('Card ID:');
    console.log(card_id);
    if(card_id == null){
        return res.status(401).send("Could not find queried card.");
    }
  const { trade_quantity, trade_price } = req.body;
  const seller_id = req.session.user.user_id; // Assuming you have user session setup

  const card_in_db_query = `SELECT * FROM cardinfo WHERE card_id = $1 LIMIT 1;`; 
  const card_in_db = await db.oneOrNone(card_in_db_query, [card_id]);
  if(card_in_db == null){
    const insert_card_query = `INSERT INTO cardinfo (card_id, card_name, price) VALUES ($1, $2, $3) RETURNING *;`;
    await db.one(insert_card_query, [card_id, card_name, card_price])
        .then(card => {
            console.log(card);
        })
        .catch(error => {
            console.error(error);
            return res.status(401).send("Could not insert card into database.");
        });
  }

  db.tx(t => {
    return t.one('INSERT INTO trade(card_id, trade_quantity, trade_price) VALUES($1, $2, $3) RETURNING trade_id', [card_id, trade_quantity, trade_price])
      .then(trade => {
        const trade_id = trade.trade_id;
        return t.none('INSERT INTO user_to_trade(seller_id, trade_id) VALUES($1, $2)', [seller_id, trade_id]);
      });
  })
    .then(() => {
      res.redirect('/trade');
    })
    .catch(error => {
      console.log(error);
      res.send('Error');
    });
});

// -------------------------------------  ADDITIONAL ROUTES   ----------------------------------------------
app.get('/welcome', (req, res) => {
    res.json({ status: 'success', message: 'Welcome!' });
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
  });

// Export the app for testing purposes
module.exports = {app, db};
