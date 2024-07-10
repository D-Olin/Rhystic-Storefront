DROP TABLE IF EXISTS userinfo CASCADE;
CREATE TABLE IF NOT EXISTS userinfo (
    user_id SERIAL PRIMARY KEY NOT NULL,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL,
    money int NOT NULL DEFAULT 100
    -- pfp_url text DEFAULT "/img/profile_circle_icon.png"
);

DROP TABLE IF EXISTS cardinfo CASCADE;
CREATE TABLE IF NOT EXISTS cardinfo (
    card_id SERIAL PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    mana_cost TEXT,
    price DECIMAL(10,2),
    rarity VARCHAR(100) NOT NULL CONSTRAINT limited_values CHECK (rarity in ('common', 'uncommon', 'rare', 'mythic','special','bonus'))
);

DROP TABLE IF EXISTS trade CASCADE;
CREATE TABLE IF NOT EXISTS trade (
    trade_id SERIAL PRIMARY KEY NOT NULL,
    trade_quantity INT NOT NULL,
    trade_price DECIMAL(10,2)
);

DROP TABLE IF EXISTS user_to_card CASCADE;
CREATE TABLE IF NOT EXISTS user_to_card (
    user_id INT NOT NULL,
    card_id INT NOT NULL,
    trade_id INT, -- allow null, add a check for if not null in the trade id and if not null, then theyve initiated a trade
    owned_count INT NOT NULL,
    cart_count INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES userinfo (user_id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES cardinfo (card_id) ON DELETE CASCADE,
    FOREIGN KEY (trade_id) REFERENCES trade (trade_id) ON DELETE CASCADE
);
