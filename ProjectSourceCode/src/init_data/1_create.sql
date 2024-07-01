DROP TABLE IF EXISTS userinfo CASCADE;
CREATE TABLE IF NOT EXISTS userinfo (
    user_id SERIAL PRIMARY KEY NOT NULL,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL
);

DROP TABLE IF EXISTS cardinfo CASCADE;
CREATE TABLE IF NOT EXISTS cardinfo (
    card_id SERIAL PRIMARY KEY NOT NULL,
    name VARCHAR(100) NOT NULL,
    discription TEXT NOT NULL,
    image_url VARCHAR(300) NOT NULL,
    cost VARCHAR(10) NOT NULL,
    rarity VARCHAR(100) NOT NULL CONSTRAINT limited_values CHECK (rarity in ('common', 'uncommon', 'rare', 'mythic_rare'))
);

DROP TABLE IF EXISTS user_to_card CASCADE;
CREATE TABLE IF NOT EXISTS user_to_card (
user_id INT NOT NULL,
card_id INT NOT NULL,
card_count INT NOT NULL,
FOREIGN KEY (user_id) REFERENCES userinfo (user_id) ON DELETE CASCADE,
FOREIGN KEY (card_id) REFERENCES cardinfo (card_id) ON DELETE CASCADE

);
