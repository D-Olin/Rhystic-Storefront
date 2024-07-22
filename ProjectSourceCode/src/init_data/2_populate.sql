INSERT INTO userinfo
    (name,username,email,password)
VALUES
    ('John Doe','jDoe','john.doe@email.com','$2b$10$Tru9/A34miRCbbY8YsnXH.EoHnj65H//COw6dr5qMDCAWunralPWm'),
    ('Jane Doe','janeD','jane.doe@email.com','password');


INSERT INTO cardinfo
    (card_id,card_name,description,image_url,mana_cost,price,rarity)
VALUES
    ('a8a64329-09fc-4e0d-b7d1-378635f2801a' ,'Fury Sliver', 'All Sliver creatures have double strike.', 'https://cards.scryfall.io/normal/front/0/0/0000579f-7b35-4ed3-b44c-db2a538066fe.jpg?1562894979', '{5}{R}',0.42,'uncommon'),
    ('00006596-1166-4a79-8443-ca9f82e6db4e' ,'Kor Outfitter', 'When Kor Outfitter enters the battlefield, you may attach target Equipment you control to target creature you control.', 'https://cards.scryfall.io/normal/front/0/0/00006596-1166-4a79-8443-ca9f82e6db4e.jpg?1562609251', '{W}{W}',0.15,'common');


INSERT INTO user_to_card
    (user_id,card_id,owned_count)
VALUES
    (1,'a8a64329-09fc-4e0d-b7d1-378635f2801a',3),
    (1,'00006596-1166-4a79-8443-ca9f82e6db4e',4);

INSERT INTO trade
    (card_id,trade_quantity,trade_price)
VALUES
    ('00006596-1166-4a79-8443-ca9f82e6db4e',1,35);

INSERT INTO user_to_trade
    (seller_id,trade_id)
VALUES 
    (1,1)