const express = require('express');
const bodyParser = require('body-parser');
const handlebars = require('express-handlebars');
const methodOverride = require('method-override');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');

const User = require('./db/models/User.js');

const routes = require('./routes');

const app = express();

app.engine('.hbs', handlebars({ extname: '.hbs', defaultLayout: 'main' }));
app.set('view engine', '.hbs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
  })
);
app.use(express.static('public'));
app.use(methodOverride('_method'));
app.use(passport.initialize());
app.use(passport.session());

// after login
passport.serializeUser((user, done) => {
  console.log('serializing');
  return done(null, {
    id: user.id,
    email: user.email
  });
});

// after every request
passport.deserializeUser((user, done) => {
  console.log('deserializing');
  new User({ id: user.id })
    .fetch()
    .then(user => {
      user = user.toJSON();
      return done(null, {
        id: user.id,
        email: user.email
      });
    })
    .catch(err => {
      console.log(err);
      return done(err);
    });
});

passport.use(
  new LocalStrategy({ usernameField: 'email' }, function(
    email,
    password,
    done
  ) {
    return new User({ email })
      .fetch()
      .then(user => {
        if (user === null) {
          return done(null, false, { message: 'bad email or password' });
        }
        user = user.toJSON();
        if (password !== user.password) {
          return done(null, false, { message: 'bad email or password' });
        }
        return done(null, user);
      })
      .catch(err => {
        console.log('error: ', err);
        return done(err);
      });
  })
);

app
  .route('/register')
  .get((req, res) => {
    return res.redirect('register.html');
  })
  .post((req, res) => {
    return new User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password
    })
      .save()
      .then(user => {
        console.log(user);
        return res.redirect('/');
      })
      .catch(err => {
        console.log(err);
        return res.send('Stupid email');
      });
  });

app
  .route('/login')
  .get((req, res) => {
    return res.redirect('/login.html');
  })
  .post(
    passport.authenticate('local', {
      successRedirect: '/',
      failureRedirect: '/login'
    })
  );

app.route('/logout').get((req, res) => {
  req.logout();
  return res.redirect('/');
});

app.use('/', routes);

module.exports = app;
