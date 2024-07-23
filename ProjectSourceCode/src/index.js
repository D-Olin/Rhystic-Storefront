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
            res.redirect('/');
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
        // res.status(401).send("You are not logged in");
        return res.redirect('/login')
    }
    next();
}


// -------------------------------------  ROUTES for profile.hbs   ----------------------------------------------
app.get('/profile', isLoggedIn, async(req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    try{
        const card = await db.any('SELECT * FROM cardinfo ci JOIN user_to_card utc ON ci.card_id = utc.card_id WHERE utc.user_id = $1', [req.session.user.user_id]);
        const user = await db.one('SELECT * FROM userinfo WHERE user_id = $1', [req.session.user.user_id]);
        res.render('pages/profile', {
            user,
            card
        });
        console.log(req.session.user)
        console.log(user)
    }
    catch(err){
        console.log(err);
    };
});

app.post('/profile/edit', isLoggedIn, async(req,res) => {
    const{name,username,pfp_url,user_id} = req.body;
    try{
        await db.oneOrNone('UPDATE userinfo SET pfp_url = $3, name = $1, username = $2 WHERE user_id = $4',[name,username,pfp_url,user_id])
        console.log('User Update Successful')
    }
    catch(err){
        console.log(err)
    }
    return res.redirect('/profile')
});




app.post('/profile/add_card', isLoggedIn, async (req, res) => {
    var card_id, card_name, description, image_url, mana_cost, card_price, rarity;
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
          description = card.data.oracle_text;
          image_url = card.data.image_uris.large;
          mana_cost = card.data.mana_cost;
          card_price = card.data.prices.usd;
          rarity = card.data.rarity;
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
  const { quantity } = req.body;
  const user_id = req.session.user.user_id; // Assuming you have user session setup

  const card_in_db_query = `SELECT * FROM cardinfo WHERE card_id = $1 LIMIT 1;`; 
  const card_in_db = await db.oneOrNone(card_in_db_query, [card_id]);
  if(card_in_db == null){
    const insert_card_query = `INSERT INTO cardinfo (card_id, card_name, description, image_url, mana_cost, price, rarity) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;`;
    await db.one(insert_card_query, [card_id, card_name, description, image_url, mana_cost, card_price, rarity])
        .then(card => {
            console.log(card);
        })
        .catch(error => {
            console.error(error);
            return res.status(401).send("Could not insert card into database.");
        });
  }

  const num_card_owned = await db.oneOrNone(`SELECT owned_count FROM user_to_card WHERE user_id = $1 AND card_id = $2;`, [user_id, card_id]);
  if(num_card_owned == null){
    const card_to_user_query = `INSERT INTO user_to_card (user_id, card_id, owned_count) VALUES ($1, $2, $3) RETURNING *;`;
    await db.one(card_to_user_query, [user_id, card_id, quantity])
        .then(user_to_card =>{
            console.log(user_to_card);
        })
        .catch(error => {
            console.error(error);
            return res.status(401).send("Could not insert relation into database."); 
        })
  }else{
    const card_to_user_query = `UPDATE user_to_card SET owned_count = $1 WHERE user_id = $2 AND card_id = $3 RETURNING *;`;
    await db.one(card_to_user_query, [num_card_owned + quantity, user_id, card_id])
        .then(user_to_card =>{
            console.log(user_to_card);
        })
        .catch(error => {
            console.error(error);
            return res.status(401).send("Could not insert relation into database."); 
        })
  }
  return res.redirect('/profile');
});

// -------------------------------------  ROUTES for cart.hbs   ----------------------------------------------

app.get('/cart', isLoggedIn, async(req,res)=> {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    try{
        const cards = await db.any('SELECT ci.*,t.trade_quantity,t.trade_id FROM cardinfo ci JOIN trade t ON ci.card_id = t.card_id JOIN cart c ON t.trade_id = c.trade_id WHERE c.user_id = $1', [req.session.user.user_id]);
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
        await db.oneOrNone('DELETE FROM cart WHERE trade_id=$1 AND user_id = $2; DELETE FROM trade WHERE trade_id = $1;',[trade_id,user_id]);
        console.log('Card Removal Successful')
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
        await db.oneOrNone('DELETE FROM cart WHERE trade_id=$1 AND user_id = $2; DELETE FROM trade WHERE trade_id = $1;',[trade_id,user_id]);
        await db.oneOrNone('UPDATE userinfo SET money=userinfo.money-$3::DECIMAL WHERE user_id = $2;',[trade_id,user_id,totalPrice]);
        console.log('Card Purchase Successful')
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

app.post('/store/search/add', async (req,res) =>{
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const {card_id,card_name,description,image_url,mana_cost,price,rarity,user_id} = req.body;
    // console.log(req.body);
    // console.log(description)
    try {
        await db.oneOrNone('INSERT INTO cardinfo (card_id,card_name,description,image_url,mana_cost,price,rarity) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (card_id) DO NOTHING',[card_id,card_name,description,image_url,mana_cost,price,rarity]);
        try{
            const testDupe = await db.any('SELECT COALESCE((SELECT t.trade_id FROM cardinfo ci JOIN trade t ON t.card_id = ci.card_id JOIN cart c ON c.trade_id = t.trade_id WHERE c.user_id = $2 AND t.card_id = $1),0) AS trade_ID;',[card_id,user_id]);
            if(testDupe[0].trade_id == 0){
                await db.oneOrNone('WITH tradeIdReturn AS (INSERT INTO trade (card_id,trade_quantity,trade_price) VALUES ($1,1,$2) RETURNING trade_id) INSERT INTO cart (count,trade_id,user_id) VALUES (1,(SELECT trade_id FROM tradeIdReturn),$3);',[card_id,price,user_id])
                console.log('Cart Insertion success')
            }
            else if(testDupe[0].trade_id !== 0){
                await db.oneOrNone('UPDATE trade SET trade_quantity = (SELECT trade_quantity FROM trade WHERE trade_id = $1)+1 WHERE trade_id = $1',[testDupe[0].trade_id])
                console.log('Cart Update success')
            }
        }
        catch(err){
            console.log('Cart Insert err:',err);
        }
    }
    catch (err) {
        console.log(err)
    }
    // res.render('pages/store', {message: 'card added'});
});

// -------------------------------------  ROUTES for trade.hbs   ----------------------------------------------

// Route to display the trade page
app.get('/trade', isLoggedIn, (req, res) => {
  db.any(`SELECT trade.trade_id, trade.trade_quantity, trade.trade_price, cardinfo.card_name, userinfo.username AS seller_name 
    FROM trade 
    JOIN cardinfo ON trade.card_id = cardinfo.card_id 
    JOIN user_to_trade ON trade.trade_id = user_to_trade.trade_id 
    JOIN userinfo ON user_to_trade.seller_id = userinfo.user_id;`)
    .then(async (trades) => {
        const cards = await db.any(`SELECT cardinfo.card_id, cardinfo.card_name, user_to_card.owned_count
            FROM cardinfo 
            INNER JOIN user_to_card
            ON cardinfo.card_id = user_to_card.card_id
            WHERE user_to_card.user_id = $1`, [req.session.user.user_id]);
        res.render('pages/trade', { trades, cards, user: req.session.user });
    })
    .catch(error => {
      console.log(error);
      res.send('Error');
    });
});

// Route to create a new trade
app.post('/trade/create', isLoggedIn, async (req, res) => {
    //TODO: Select cards from inventory instead of searching by card id
  const { card_id, trade_quantity, trade_price } = req.body;
  const seller_id = req.session.user.user_id; // Assuming you have user session setup

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
