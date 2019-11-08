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

function homeLoader(req,res, displayedMsg){
    let sql = 'SELECT path FROM images;';
        db.all(sql, function(err, row){
            if(err){
                //res.end(err);
                console.error(err);
            }else{
                if(row.length == 0)
                {
                    console.log('no entrys')
                    res.render('home', { authSuccessMessage: displayedMsg,
                        username: req.session.username,
                        email: req.session.email});
                }
                else{
                    res.render('home', {authSuccessMessage: displayedMsg, paths: row.path, title: row.title,
                    username: req.session.username,
                    email: req.session.email});
                }
            }
        });
}

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
        //Arrayübergabe paths head
        homeLoader(req,res, `Logged in as: ${req.session.username}`)
        //Arrayübergabe paths foot
        //res.render('home', {authSuccessMessage: `Logged in as: ${req.session.username}`});
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
        title: 'Error 404 Website not found',
        error: "Well, that didn't work...It seems like we can't find the website you requested."
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

//Für den logoutbutton
app.post('/logout',function(req,res){
    res.session.destroy;
    res.send('start');
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
            //res.end('Something went wrong or user already exists');
            res.render('changeuserdata',{msgChange: 'User has been already taken',
                username: req.session.username, 
                email: req.session.email
            });
            console.error(err);
        }else{
            req.session.username = new_username
            
            res.render('changeuserdata',{
                username: new_username,
                email: req.session.email,
                msgChange: 'Succesfully Changed'
            });
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
            res.render('changeuserdata',{msgChange: 'email has been already taken',
                username: req.session.username, 
                email: req.session.email});
            console.error(err);
        }else{
            res.render('changeuserdata',{msgChange: 'Email has been changed', 
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
                res.render('changeuserdata',{msgChange: 'Password has been changed', 
                    username: req.session.username,
                    email: new_email
                });
            }
            });
    }else{
        res.render('changeuserdata',{msgChange: 'Password did not matched re', 
                    username: req.session.username,
                    email: new_email
                });
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
                    res.send ('start',{msgRegister:'User was eleted'});
                }
            });
        }
    });
});

// ToDo: Funktion zur Speicherung der Bilddateien 
app.post('/upload', function(req, res) {
    console.log(req.files);
    const username = req.session.username;
    const title = req.body.title;
    const file = req.files.file;
    let path = __dirname + '/files/' + file.name;


    console.log(file.size);

    if(file.size < 1024 * 1024 * 50){
        //file.mv(__dirname + '/files/' + file.name)
        //res.send('uploaded: ' + file.name + ' by: ' + username);
        //SQL Befehl um einen neuen Eintrag der Tabelle user hinzuzufügen
        //Handling for if datbase is empty
        let sql = `SELECT * FROM images;`;
        db.all(sql, function(err, row){
            if (err){ 
                console.log(`Somthing went wrong`);
            }else{
                //zulässige Datentypen
                if(file.mimetype == "image/jpeg"){
                    path = __dirname + '/files/' + row.length.toString(10) + ".jpg";
                }else if(file.mimetype = "image/png"){
                    path = __dirname + '/files/' + row.length.toString(10) + ".png";
                }else{
                    return res.end('unzulässiger Datentyp');
                }

                sql = `INSERT INTO images (path, title, username, date) VALUES ("${path}", "${title}", "${username}", date('now'));`
                db.run(sql, function(err) {
                    if (err) {
                        return res.render('upload', {msgUpload: 'Somthing went wrong' });
                    } else {
                        file.mv(path);
                        return res.render('home',{msg : 'UploadSucced'});
                    }
                });
            }
        });
    }else{
        //file was to big
        return res.render('upload', {msgUpload: 'file was to big!' });
    }
});

// ToDo: Funktion zur Rueckgabe der Bilddateien + Username, Title