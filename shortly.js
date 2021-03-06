var express = require('express');
var session = require('express-session');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

var sess = {
  resave: false,
  saveUninitialized: true,
  secret: 'more cowbell',
  cookie: {
    maxAge: 2000
  }
};

if (app.get('env') === 'production') {
  app.set('trust proxy', 1);
  sess.cookie.secure = true;
}

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session(sess));

const isLoggedIn = (req) => {
  return req.session ? !!req.session.user : false;
};

const assignSession = (req, res, newUser) => {
  return req.session.regenerate(function() {
    req.session.user = newUser;
    res.redirect('/');
  });
};

const checkUser = (req, res, next) => {
  if (!isLoggedIn(req)) {
    res.redirect('/login');
  } else {
    next();
  }
};

app.get('/', checkUser, 
function(req, res) {
  res.render('index');
});

app.get('/create', checkUser, 
function(req, res) {
  res.render('index');
});

app.get('/links', checkUser, 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links', checkUser, 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login',
function(req, res) {
  res.render('login');
});

app.get('/logout',
function(req, res) {
  req.session.destroy(function() {
    res.redirect('/login');
  });
});

app.get('/signup',
function(req, res) {
  res.render('signup');
});

app.post('/login',
function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User( { username: username } ).fetch()
    .then(function(user) {
      if (user) {
        // if (password === user.attributes.password) {
        //   assignSession(req, res, user);
        // } else {
        //   res.redirect(403, '/login');
        // }
        this.comparePassword(password, user.attributes.password, function(err, result) {
          if (err) {
            return res.status(403).send('Incorrect password');
          }
          if (result) {
            return res.redirect(201, '/');
          } else {
            return res.redirect(403, '/login');
          }
        });
      } else {
        res.redirect('/login');
      }
    });

});

app.post('/signup',
function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  
  new User( { username: username } ).fetch()
    .then(function(found) {
      if (found) {
        console.log('found');
        return res.redirect(200, '/signup');
      } else {
        //create the new user in DB
        this.hashPassword(password, function(err, result) {
          if (err) {
            console.log('user hash password error: ' + err);
            return res.sendStatus(404);
          }

          Users.create({
            username: username, 
            password: result 
          })
          .then(function(newUser) {
            // console.log('user stored: ' + JSON.stringify(newUser));
            // res.status(201).send(newUser);
            assignSession(req, res, newUser);
          });
        });
      }
    });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
