DROP TABLE IF EXISTS userinfo CASCADE;
CREATE TABLE IF NOT EXISTS userinfo (
    user_id SERIAL PRIMARY KEY NOT NULL,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL,
    money int NOT NULL DEFAULT 100
);

DROP TABLE IF EXISTS cardinfo CASCADE;
CREATE TABLE IF NOT EXISTS cardinfo (
    card_id SERIAL PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    cost TEXT,
    rarity VARCHAR(100) NOT NULL CONSTRAINT limited_values CHECK (rarity in ('common', 'uncommon', 'rare', 'mythic','special','bonus'))
);

DROP TABLE IF EXISTS user_to_card CASCADE;
CREATE TABLE IF NOT EXISTS user_to_card (
user_id INT NOT NULL,
card_id INT NOT NULL,
owned_count INT NOT NULL,
cart_count INT NOT NULL,
FOREIGN KEY (user_id) REFERENCES userinfo (user_id) ON DELETE CASCADE,
FOREIGN KEY (card_id) REFERENCES cardinfo (card_id) ON DELETE CASCADE

);
