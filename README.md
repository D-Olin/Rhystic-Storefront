# CSCI3308Project

Project Description :
The Rhystic Storefront is a web app that allows Magic: the Gathering players to buy and sell Magic cards with ease. Users are able to make an account, and with that account, easily search up cards that they want, add or remove them from their cart, and purchase cards from their cart. They can also view their own cards, including cards that they’ve bought from the site, and list them for sale at custom prices. Card search functionality is powered by the Scryfall API, a comprehensive Magic card database which allows for easy and accurate searching of cards.  

 Project Directory Structure :

 ProjectSourceCode/
│
├── .gitignore
├── docker-compose.yaml
├── package.json
├── package-lock.json
├── rhystic_json_format_script.py
├── src/
│   ├── index.js
│   ├── init_data/
│   │   ├── 1_create.sql
│   │   └── 2_populate.sql
│   ├── resources/
│   │   ├── css/
│   │   │   └── style.css
│   │   ├── img/
│   │   │   ├── profile_circle_icon.png
│   │   │   ├── Rhystic.png
│   │   │   ├── search_icon.png
│   │   │   └── tab_icon.png
│   │   └── js/
│   │       └── script.js
│   └── views/
│       ├── layouts/
│       │   └── main.hbs
│       ├── pages/
│       │   ├── cart.hbs
│       │   ├── home.hbs
│       │   ├── login.hbs
│       │   ├── logout.hbs
│       │   ├── profile.hbs
│       │   ├── signup.hbs
│       │   ├── store.hbs
│       │   └── trade.hbs
│       └── partials/
│           ├── footer.hbs
│           ├── head.hbs
│           ├── message.hbs
│           ├── navbar.hbs
│           └── title.hbs
└── test/
    └── server.spec.js


How to run the project:
Execute this command to build and start the containers defined in the docker-compose.yaml file: docker-compose up
To stop the containers : docker-compose down -v

Deployment:
https://rhystic-storefront.onrender.com/ 


