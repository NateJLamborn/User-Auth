var express = require('express');
var router = express.Router();
var models = require('../models');
var authService = require('../services/auth');

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

router.get('/profile/:id', authService.verifyUser, function(req, res, next) {
  if (!req.isAuthenticated()) {
     return res.send('You are not authenticated');
  }
  if (req.params.id !== String(req.user.UserId)) {
    res.send('This is not your profile');
  } else {
    res.render('profile', {
      FirstName: req.user.FirstName,
      LastName: req.user.LastName,
      Email: req.user.Email,
      UserId: req.user.UserId,
      Username: req.user.Username,
    });
  }
});

router.post('/signup', function (req, res, next) {
  models.users
    .findOrCreate({
      where: {
        Username: req.body.Username
      },
      defaults: {
        FirstName: req.body.FirstName,
        LastName: req.body.LastName,
        Email: req.body.Email,
        Password: authService.hashPassword(req.body.Password) //<--- Change to this code here
      }
    })
    .spread(function (result, created) {
      if (created) {
        res.send('User successfully created');
      } else {
        res.send('This user already exists');
      }
    });
});

// Login user and return JWT as cookie
router.post('/login', function (req, res, next) {
  models.users.findOne({
    where: {
      Username: req.body.Username
    }
  }).then(user => {
    if (!user) {
      console.log('User not found')
      return res.status(401).json({
        message: "Login Failed"
      });
    } else {
      let passwordMatch = authService.comparePasswords(req.body.Password, user.Password);
      if (passwordMatch) {
        let token = authService.signUser(user);
        res.cookie('jwt', token);
        res.send('Login successful');
      } else {
        console.log('Wrong password');
        res.send('Wrong password');
      }
    }
  });
});

router.get('/profile', function (req, res, next) {
  let token = req.cookies.jwt;
  if (token) {
    authService.verifyUser(token)
      .then(user => {
        if (user) {
          res.send(JSON.stringify(user));
        } else {
          res.status(401);
          res.send('Invalid authentication token');
        }
      });
  } else {
    res.status(401);
    res.send('Must be logged in');
  }
});

router.get('/logout', function (req, res, next) {
  res.cookie('jwt', "", { expires: new Date(0) });
  res.send('Logged out');
});

router.put('/edit-user/:id', function(req, res, next){
  let userId = parseInt(req.params.id);
  models.notes
    .update(req.body, { where: { UserId: userId } })
    .then(result => res.send("User edited"))
    .catch(err => {
      res.status(400);
      res.send("There was a problem updating your user.");
    });
})

router.delete("/delete-user/:id", function (req, res, next) {
  let userId = parseInt(req.params.id);
  models.users
    .destroy({
      where: { UserId: userId }
    })
    .then(result => res.send("User deleted"))
    .catch(err => { 
      res.status(400); 
      res.send("There was a problem deleting the User."); 
    }
);
});

module.exports = router;
