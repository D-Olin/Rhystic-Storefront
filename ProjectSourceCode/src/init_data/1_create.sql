DROP TABLE IF EXISTS userinfo CASCADE;
CREATE TABLE IF NOT EXISTS userinfo (
    user_id SERIAL PRIMARY KEY NOT NULL,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL,
    money int NOT NULL DEFAULT 100,
    pfp_url text DEFAULT '/img/profile_circle_icon.png',
    cart text[][] DEFAULT [] --json obj of trade ids [[id,count],[id,count]]
);

DROP TABLE IF EXISTS cardinfo CASCADE;
CREATE TABLE IF NOT EXISTS cardinfo (
    card_id VARCHAR(36) PRIMARY KEY NOT NULL,
    card_name TEXT NOT NULL,
    price DECIMAL(10,2)
);

DROP TABLE IF EXISTS trade CASCADE;
CREATE TABLE IF NOT EXISTS trade (
    trade_id SERIAL PRIMARY KEY NOT NULL,
    card_id VARCHAR(36) NOT NULL,
    trade_quantity INT NOT NULL,
    trade_price DECIMAL(10,2)
);

DROP TABLE IF EXISTS user_to_card CASCADE;
CREATE TABLE IF NOT EXISTS user_to_card (
user_id INT NOT NULL,
card_id VARCHAR(36) NOT NULL,
owned_count INT NOT NULL
FOREIGN KEY (user_id) REFERENCES userinfo (user_id) ON DELETE CASCADE,
FOREIGN KEY (card_id) REFERENCES cardinfo (card_id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS user_to_trade CASCADE;
CREATE TABLE IF NOT EXISTS user_to_trade (
    seller_id INT NOT NULL,
    trade_id INT NOT NULL,
    FOREIGN KEY (seller_id) REFERENCES userinfo (user_id) ON DELETE CASCADE,
    FOREIGN KEY (trade_id) REFERENCES trade (trade_id) ON DELETE CASCADE
)
