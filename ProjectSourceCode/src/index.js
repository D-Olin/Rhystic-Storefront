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
    if (!req.session.user) {
        return res.render('pages/home');
    }
    else{
        res.render('pages/home', {
            user: req.session.user,
        });
    }
});

// Serve login page
app.get('/login', (req, res) => {
    res.render('pages/login');
});

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
        // res.json({status: 200, message: 'Success'});
        res.redirect('/login');
    } 
    catch (err) {
        console.error('Error inserting user:', err);
        res.redirect('/signup');
    }
});

// Handle user login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await db.oneOrNone('SELECT * FROM userinfo WHERE username = $1', [username]);

        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = user;
            res.redirect('/');
        } else {
            res.redirect('/login');
        }
    } catch (err) {
        console.error('Error logging in user:', err);
        res.redirect('/login');
    }
});

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
        // console.log(cards) //testing log 
        res.render('pages/profile', {
            user: req.session.user,
            card: cards
        });
        console.log(req.session.user)
    })
    .catch(err => {
        console.log(err);
    });
});



// -------------------------------------  ROUTES for cart.hbs   ----------------------------------------------

app.get('/cart',(req,res)=> {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    db.any('SELECT ci.*,t.trade_quantity,t.trade_id FROM cardinfo ci JOIN trade t ON ci.card_id = t.card_id WHERE trade_id IN (SELECT unnest(cart) FROM userinfo ui WHERE ui.user_id = $1)', [req.session.user.user_id])
    .then(cards => {
        // console.log(cards) //testing log 
        res.render('pages/cart', {
            user: req.session.user,
            cards
        });
        // console.log(req.session.user)
    })
    .catch(err => {
        console.log(err);
    });
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
  if(sort_by != null && sort_dir != null){
    var api_call = 'https://api.scryfall.com/cards/search?q=' + search_query_no_space + '+unique:prints+(game:paper)' + '&order=' + sort_by + '&dir=' + sort_dir;
  }else{
    var api_call = 'https://api.scryfall.com/cards/search?q=' + search_query_no_space + '+unique:prints+(game:paper)';
  }

  console.log(api_call);

  const scryfallRes = fetch(api_call, {method: "GET"})
    .then((response) => response.json())
    .then((json) => res.render('pages/store', {user: req.session.user, json, search_query, sort_by, sort_dir}));

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
            const testDupe = await db.any('SELECT COALESCE((SELECT t.trade_id FROM cardinfo ci JOIN trade t ON t.card_id = ci.card_id WHERE (t.trade_id IN (SELECT unnest(cart) FROM userinfo ui WHERE ui.user_id = 1) AND ci.card_id = $1)),0) AS trade_ID;',[card_id]);
            if(testDupe[0].trade_id == 0){
                await db.oneOrNone('WITH tradeIdReturn AS (INSERT INTO trade (card_id,trade_quantity,trade_price) VALUES ($1,1,$2) RETURNING trade_id) UPDATE userinfo SET cart = ARRAY_APPEND (cart, (SELECT trade_id FROM tradeIdReturn)) WHERE user_id = $3;',[card_id,price,user_id])
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

// -------------------------------------  ROUTES for testcases   ----------------------------------------------


app.get('/welcome', (req, res) => {
    res.json({status: 'success', message: 'Welcome!'});
});


const PORT = process.env.PORT || 3000;
module.exports = app.listen(3000);
// (PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
// });