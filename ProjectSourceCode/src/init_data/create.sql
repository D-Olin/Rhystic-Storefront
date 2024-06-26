DROP TABLE IF EXISTS userinfo CASCADE;
CREATE TABLE IF NOT EXISTS userinfo (
    user_id SERIAL PRIMARY KEY NOT NULL,
    name VARCHAR(100),
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL
);

DROP TABLE IF EXISTS cardinfo CASCADE;
CREATE TABLE IF NOT EXISTS cardinfo (
    card_id SERIAL PRIMARY KEY NOT NULL,
    name VARCHAR(100),
    cost DECIMAL(6,2) NOT NULL,
    rarity VARCHAR(100) NOT NULL VARCHAR(100) CONSTRAINT limited_values CHECK (difficulty in ('common', 'uncommon', 'rare', 'mythic_rare')),
);

