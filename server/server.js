// node module
const express = require('express');
const uuid = require('uuid/v4')
const session = require('express-session');
const FileStore = require('session-file-store')(session)
const bodyParser = require('body-parser')
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const axios = require('axios');

const users = [
    { id: 12345, email: 'peter@ex.com', password: 'password' }
]

// configure passport
passport.use(new LocalStrategy(
    {usernameField: 'email'},
    (email, password, done)=>{
        axios.get(`http://localhost:5000/users?email=${email}`)
            .then(res=>{
                console.log(res)
                const user = res.users[0]
                if(!user){
                    return done(null, false, {message: "Invalid credentials. \n"});
                }
                if (password != user.password){
                    return done(null, false, {message: "Invalid credentials.\n"});
                }
                return done(null, user)
            })
            .catch(error=>done(error));
    }
))


// passport serialize user
passport.serializeUser((user, done)=>{
    console.log('Inside serializer');
    done(null, user.id)
})

passport.deserializeUser((id, done)=>{
    console.log("Inside deserialisers")
    const user = users[0].id === id?users[0]:false
    axios.get(`http://localhost:5000/users/${id}`)
    .then(res=> done(null, res.data))
    .catch(err=> done(err, false))
})

// create our server instance
const app = express();

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))
app.use(
    session({
        genid: (req)=>{
            console.log('Inside the session middleware.')
            return uuid()
        },
        store: new FileStore(),
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: true
    })
)
app.use(passport.initialize());
app.use(passport.session());


// homepage
app.get('/', (req, res)=>{
    console.log(req.sessionID)
    res.send(`Ooops!, it seems you are on the home page.\n`)
});

// login get 
app.get("/login", (req, res)=>{
    console.log('Inside GET /login callback function')
    console.log(req.sessionID)
    res.send(`You are on the login page!\n`)
})

// login post
app.post("/login", (req, res, next)=>{
    console.log("Inside the POST /login callback function")
    passport.authenticate('local', (err, user, info)=>{
        if(info){return res.send(info.message);}
        else if(err){return next(err);}
        else if (!user){return res.redirect('/login')}
        req.login(user, err => {
            if (err) {
                return next(err);
            }
            return res.redirect('/authorised');
        })
        console.log("inside passport callback")
    })(req, res,next)
    // return res.send(`You were authenticated && logged in\n`);
})
app.get('/authorised', (req, res)=>{
    if (req.isAuthenticated()){
        res.send('you are already logged in. #wink')
    }else{
        res.redirect('/')
    }
})
// assign listening port
let port = 3030
app.listen(port, ()=>{
    console.log(`Listening on localhost:${port}`)
})

