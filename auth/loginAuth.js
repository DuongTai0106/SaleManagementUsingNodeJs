const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const UserModel = require('../models/userModel')

const loginAuth = (req, res, next) => {
    console.log('Login Auth');
    const token = req.cookies.authCookie;

    if (!token) {
        console.log('Failed to find authentication cookie');
        res.clearCookie('authCookie')
        return res.redirect('/users/login');
    }

    const { JWT_SECRET } = process.env;

    jwt.verify(token, JWT_SECRET, (err, data) => {
        if (err) {
            console.log('Failed to verify JWT');
            res.clearCookie('authCookie')
            return res.redirect('/users/login');
        }
        req.user = data;
        next();
    });
};

const isLoggedIn = (req,res,next)=>{
    console.log('isLoggedIn');
    const user = req.user;
    if (!user)
    {
        console.log('failed in isLoggin mid-ware')
        return res.redirect('/users/login')
    }
    else
    {
        next();
    }
}

const ifFirstTime = (req,res,next)=>{
    console.log('ifFirstTime');
    const username = req.user.username;
    let role;
    console.log(username)
    UserModel.findOne({username:username})
    .then(acc =>{
        if (!acc) {
            console.log("User not found");
            return res.status(404).render('error', { msg: 'User not found' ,role:req.userRole});
        }
        console.log(acc.username)
        role = acc.role
        return bcrypt.compare(username,acc.password)
    }).then(passwordMatch=>{
        
        if (passwordMatch&&role==='ADMIN')
        {
            req.isPwdChanged=true
            return next()
        }
        if (!passwordMatch)
        {
            req.isPwdChanged=true
            return next()
        }
        console.log("loginAuth - ifFirstTime - redirect to /update")
        return res.redirect('/users/update')
    }).catch(e=>{
        res.clearCookie('authCookie')
        return res.status(500).render('error', { msg: 'Internal Server Error: ' + e ,role:req.userRole});
    })
    
}

module.exports = {loginAuth,isLoggedIn,ifFirstTime}