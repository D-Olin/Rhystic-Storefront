INSERT INTO userinfo
    (name,username,email,password,pfp_url)
VALUES
    ('John Doe','jDoe','john.doe@email.com','$2b$10$Tru9/A34miRCbbY8YsnXH.EoHnj65H//COw6dr5qMDCAWunralPWm','https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fi.pinimg.com%2Foriginals%2F68%2F0e%2F24%2F680e241336ae8d3a57a42f54b656e58f.jpg&f=1&nofb=1&ipt=189ee3c805d95be9cf92baaa023f3ab79e5a71a7a12b5091be3b8731696356c3&ipo=images'),
    ('Jane Doe','janeD','jane.doe@email.com','password',NULL);


INSERT INTO cardinfo
    (card_id,card_name,price)
VALUES
    ('a8a64329-09fc-4e0d-b7d1-378635f2801a','Fury Sliver', 0.42),
    ('00006596-1166-4a79-8443-ca9f82e6db4e','Kor Outfitter', 0.15);


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