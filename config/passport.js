const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../model/userModel'); // Adjust the path as needed

// Ensure dotenv is loaded
require('dotenv').config();

passport.serializeUser((user, done) => {
    done(null, user._id); // Store only the user ID in the session
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user); // Retrieve user details using ID
    } catch (err) {
        done(err, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/callback',
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    console.log('Google Strategy Callback');
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            console.log('Creating New User');
            user = new User({
                googleId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value
            });
            await user.save();
        }
        done(null, user);
    } catch (err) {
        console.error('Error in Google Strategy:', err);
        done(err);
    }
  }
));

