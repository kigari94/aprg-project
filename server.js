// Initialisierung der Module
const express = require('express');
const app =  express();

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended:true}));

app.engine('.ejs', require('ejs').__express);
app.set('view engine','ejs');

// Einbindung des views folder für ejs files
app.use(express.static(__dirname + '/views'));

// Initialisierung des Cookie Parsers
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Initialisierung von express sessions
const session = require('express-session');
app.use(session({
    secret: 'loggedIn',
    resave: false,
    saveUninitialized: true
}));

// Webserver starten
app.listen(3000, function(){
    console.log('listening on 3000');
});

// Einbindung des public folder für html und css
app.use(express.static(__dirname + '/public'));

// Verbindung zur Datenbank
const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('web.db', function(err) {
    if (err) { 
        console.error(err); 
    } else {
        console.log("Verbindung zur Datenbank wurde erfolgerich hergestellt.")
    }
});

//Auswertung nach der Registrierung
app.post('/register', function(req, res) {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    //SQL Befehl um einen neuen Eintrag der Tabelle user hinzuzufügen
    let sql = `INSERT INTO users (username, email, password) VALUES ("${username}", "${email}", "${password}");`
    db.run(sql, function(err) {
        if (err) { 
            console.error(err);
        } else {
            res.render('register_response', { 
                username: req.body.username,
                email: req.body.email
            });
        }
    });

// Aufruf Login
app.post('/login', function(req, res){
    const username = req.body.username;
    const password = req.body.password;

    // Abgleich username und passwort mit der Datenbank
    let sql = `SELECT * FROM users WHERE username="${username}" AND password="${password}"`;
    db.get(sql, function(err, row){
        if(err){
            console.error(err);
        }else{
            req.session.username = row.username;
            // req.session['username'] = row.username; <- alternative
            req.session.email = row.email;
            res.render('login_response', { 
                username: req.session.username,
                email: req.session.email
            });
        }       
    });
})

});