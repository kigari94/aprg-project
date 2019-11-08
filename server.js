// Initialisierung der Module
const express = require('express');
const app =  express();
const bcrypt = require('bcrypt');
const fileupload = require('express-fileupload');
const bodyParser = require('body-parser');

app.use(fileupload());
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
        console.log("Connection to Web-Database successfully established.")
    }
});

// Ausgabe des Login- bzw. Registrieren-Formulars
app.get('/start', function(req, res){
    if (!req.session.username){
        res.render('start');
    }else{
        res.render('home', {authSuccessMessage: `Logged in as: ${req.session.username}`});
    }
});

// Ausgabe der Account-Page
app.get('/account', function(req, res){
    if (!req.session.username){
        res.render('start', {authDeniedMessage: "Not logged in yet!"});
    }else{
        res.render('account', {authSuccessMessage: `Logged in as: ${req.session.username}`});
    }
});

// Ausgabe der Home-Page
app.get('/home', function(req, res){
    if (!req.session.username){
        res.render('start', {authDeniedMessage: "Not logged in yet!"});
    }else{
        res.render('home', {authSuccessMessage: `Logged in as: ${req.session.username}`});
    }
});

// Ausgabe der Upload-Page
app.get('/upload', function(req, res){
    if (!req.session.username){
        res.render('start', {authDeniedMessage: "Not logged in yet!"});
    }else{
        res.render('upload', {authSuccessMessage: `Logged in as: ${req.session.username}`});
    }
});

// Entry for changeuserdata
app.get('/changeuserdata', function(req,res){
    if(!req.session.username){
            console.log(req.session.username);
            res.render('start', {authDeniedMessage: "Not logged in yet!"});
    }else{
        res.render('changeuserdata',{
            username: req.session.username,
            email: req.session.email
        }) 
    }
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
    const re_password = req.body.re_password;
    
    if(password === re_password){
        // Verschluesselung des Passwortes
        let hash = bcrypt.hashSync(password, 12);

        let check = `SELECT * FROM users WHERE username == "${username}" OR email == "${email}";`

        db.all(check, function(err, rows){
            if(rows.length != 0){
                res.render('start', {msgRegister: "The username or email is already existing!"});
            }else{
                // SQL Befehl um einen neuen Eintrag der Tabelle users hinzuzufügen
                let sql = `INSERT INTO users (username, email, password) VALUES ("${username}", "${email}", "${hash}");`

                db.run(sql,function(err) {
                    if (err) { 
                        console.error(err);
                    } else {
                        req.session.username = username;
                        req.session.email = email;

                        res.render('home', { 
                            username: req.session.username,
                            email: req.session.email
                        });
                    }
                });
            }
        });
    }else{
        res.render('start', {msgRegister: "Password's did not match"});
    }
});

// Aufruf Login
app.post('/login', function(req, res){
    const username = req.body.username;
    const password = req.body.password;

    // Abgleich username und passwort mit der Datenbank
    let check = `SELECT * FROM users WHERE username =="${username}"`;
    db.all(check, function(err, row){
        if(row.length != 0){
            if(err){
                console.error(err);
            }
            
            let sql = `SELECT * FROM users WHERE username =="${username}"`;
            db.get(sql,function(err,row){
                if(bcrypt.compareSync(password, row.password)){
                    req.session.username = row.username;
                    req.session.email = row.email;
                    
                    res.render('home', { 
                        username: req.session.username,
                        email: req.session.email
                    });            
                }else{
                    res.render('start', {msgLogin: "Wrong username or password. Please try again."});           
                }
            });
        }else{
            res.render('start', {msgLogin: "Wrong username or password. Please try again."});           
        }
    });
});

// Aufruf Logout
// app.post('/logout', function(req, res){
//     delete req.session.username;
//     delete req.session.email;
//     res.render('start', {msgLogout: "Successfully logged out."});           
// });

// Post for change_username
app.post('/change_username', function(req,res){
    const new_username = req.body.new_username;
    
    let sql = `UPDATE users
    SET username = "${new_username}"
    WHERE username = "${req.session.username}";`

    db.get(sql, function(err, row){
        if(err){
            res.end('Something went wrong or user already exists');
            console.error(err);
        }else{
            req.session.username = new_username
            
            res.render('changeuserdata',{
                username: new_username,
                email: req.session.email
            })
        }
    });
});

//Post for new_email
app.post('/change_mailadress', function(req,res){
    const new_email = req.body.new_email;

    let sql = `UPDATE users
    SET email = "${new_email}"
    WHERE username = "${req.session.username}";`

    db.get(sql, function(err, row){
        if(err){
            res.end(err);
            console.error(err);
        }else{
            res.render('changeuserdata',{
                username: req.session.username,
                email: new_email
            })
        }
    });
});

//Post for new_password
app.post('/change_password', function(req,res){
    const new_password = req.body.new_password;
    const new_password_repeat = req.body.new_password_repeat;
    

    if(new_password === new_password_repeat){
        let hash = bcrypt.hashSync(new_password, 12);
        let sql = `UPDATE users
        SET password = "${hash}"
        WHERE username = "${req.session.username}";`

        db.get(sql, function(err, row){
            if(err){
                res.end(err);
                console.error(err);
            }else{
                /*res.render('changeuserdata',{
                    username: req.session.username,
                    email: req.session.email
                })*/
                res.end('password was changed');
            }
            });
    }else{
        res.end('password and password repeat didnt match blub')
    }
});

// Loeschen des users und aller dazugehörigen Datensätze
app.post('/delete_account', function(req,res){
    let sql = `DELETE FROM users WHERE username = "${req.session.username}";`

    db.get(sql, function(err, row){
        if(err){
            res.end(err);
            console.error(err);
        }else{
            req.session.destroy(function(err) {
                if(err){
                    console.log(err);
                }else
                {
                    res.end('user has been succesfully destroyed blub u dead');
                }
            });
        }
    });
});

// ToDo: Funktion zur Speicherung der Bilddateien 
app.post('/upload', function(req, res) {
    console.log(req.files);
    const username = req.session.username;
    const file = req.files.file;
    // const title = req.body.title;

    file.mv(__dirname + '/files/' + file.name)
    res.send('uploaded: ' + file.name + ' by: ' + username);
    
    // SQL Befehl um einen neuen Eintrag der Tabelle user hinzuzufügen
    // let sql = `INSERT INTO files (username, file, title, date) VALUES ("${username}", "${file}", "${title}", date(now));`
    // db.run(sql, function(err) {
    //     if (err) { 
    //         console.error(err);
    //     } else {
    //         res.render('home', { 
    //             username: req.body.username,
    //             title: req.body.title
    //         });
    //     }
    // });
});

// ToDo: Funktion zur Rueckgabe der Bilddateien + Username, Title

