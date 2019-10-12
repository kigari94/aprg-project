const express = require('express');
const app = express();

// Body Parser zum Auslesen von Formularen
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

// Initialisierung der EJS Template Engine
app.engine('.ejs', require('ejs').__express);
app.set('view engine', 'ejs');

// Einbindung des views folder für ejs files
app.use(express.static(__dirname + '/views'));

// Webserver starten
app.listen(3000, function(){
    console.log('listening on 3000');
})

// Einbindung des public folder für html und css
app.use(express.static(__dirname + '/public'));