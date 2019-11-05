// Initialisierung der Module
const express = require('express');
const app =  express();
const bcrypt = require('bcrypt');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended:true}));

app.engine('.ejs', require('ejs').__express);
app.set('view engine','ejs');

// Einbindung des views folder für die ejs files
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

// Verbindung zur Datenbank
const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('web.db', function(err) {
    if (err) { 
        console.error(err); 
    } else {
        console.log("Verbindung zur Web-Datenbank wurde erfolgreich hergestellt.")
    }
});

// Ausgabe des Login- bzw. Registrieren-Formulars
app.get('/start', function(req, res){
    res.render('start');
});

// Ausgabe der Account-Page
app.get('/account', function(req, res){
    res.render('account');
});

// Ausgabe der Home-Page
app.get('/home', function(req, res){
    res.render('home');
});

// Ausgabe der Upload-Page
app.get('/upload', function(req, res){
    res.render('upload');
});

// 404 Error handling
app.get('*', function(req, res){
    res.render('error', {
        title: '404 Seite nicht gefunden',
        error: 'Die Seite konnte leider nicht gefunden werden. Überprüfe bitte, ob die Adresse stimmt.'
    });
});

// Auswertung der Registrierung
app.post('/register', function(req, res) {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    // Verschluesselung des Passwortes
    let hash = bcrypt.hashSync(password, 12);

    let check = `SELECT * FROM users WHERE username == "${username}";`

    db.all(check, function(err, rows){
        if(rows.length != 0){
            res.end("Der eingegebene Username existiert bereits!");
        }else{
            // SQL Befehl um einen neuen Eintrag der Tabelle users hinzuzufügen
            let sql = `INSERT INTO users (username, email, password) VALUES ("${username}", "${email}", "${hash}");`

            db.run(sql,function(err) {
                if (err) { 
                    console.error(err);
                } else {
                    res.render('register_response', { 
                        username: req.body.username,
                        email: req.body.email
                    });
                }
            });
        }
    });
});

// Aufruf Login
app.post('/login', function(req, res){
    const username = req.body.username;
    const password = req.body.password;

    // Abgleich username und passwort mit der Datenbank
    let sql = `SELECT * FROM users WHERE username="${username}"`;
    db.get(sql, function(err, row){
        if(err){
            console.error(err);
        }
        req.session.username = row.username;
        req.session.email = row.email;
        
        if(bcrypt.compareSync(password, row.password)){
            res.render('login_response', { 
                username: req.session.username,
                email: req.session.email
            });            
        }else{
            res.end('Wrong username or password. Please try again.');            
        }
    });
});

// ToDo: Änderung der Datensätze für username, email und password
// ToDo: Loeschen des users und aller dazugehörigen Datensätze

// ToDo: Funktion zur Speicherung der Bilddateien 
app.post('/upload', function(req, res) {
    const file = req.body.file;
    const title = req.body.title;
    
    // SQL Befehl um einen neuen Eintrag der Tabelle user hinzuzufügen
    let sql = `INSERT INTO files (username, file, title, date) VALUES ("${username}", "${file}", "${title}", date(now));`
    db.run(sql, function(err) {
        if (err) { 
            console.error(err);
        } else {
            res.render('home', { 
                username: req.body.username,
                title: req.body.title
            });
        }
    });
});

// ToDo: Funktion zur Rueckgabe der Bilddateien + Username, Title