const UserModel = require('../models/userModel')

const  roleCheckOrder = (req, res, next) => {
    console.log('in role check order')
    const user = req.user;
    let userRole; 
    UserModel.findOne({ username: user.username })
    .then(u => {
        if (!u) {
            console.log('User not found in the database');
            return res.redirect('/users/login');
        }
        userRole = u.role
        userFullname = u.fullname
        const methodUsed = req.method;
        console.log(methodUsed)

        if (userRole === 'ADMIN') {
            console.log("this user is admin")
            req.userRole = userRole;
            req.UserName=userFullname;
            req.userData = u;
            return next();
        }
    
        if (userRole === 'SALEPERSON') {
            console.log("Accessed Path:", req.path);
            if (!methodUsed==='GET') 
            {
                console.log("access denied")
                return res.status(403).render('error',{msg:'access denined',role:req.userRole});
            }
            console.log("this user is saleperson")
            req.userRole = userRole;
            req.UserName=userFullname;
            req.userData = u;
            return next();
        }
    
        console.log("no role found")
        return res.status(403).render('error',{msg:'no role found',role:req.userRole});
    })
        .catch(err => {
            console.log('Error fetching user from the database: ', err);
            return res.redirect('/users/login');
        });
};

const roleCheckProduct = (req, res, next) => {
    console.log('in role check product')
    const user = req.user;
    let userRole; 
    UserModel.findOne({ username: user.username })
    .then(u => {
        if (!u) {
            console.log('User not found in the database');
            return res.redirect('/users/login');
        }
        userRole = u.role
        userFullname = u.fullname
        const methodUsed = req.method;
        console.log(methodUsed)

        if (userRole === 'ADMIN') {
            console.log("this user is admin")
            req.userRole = userRole;
            req.UserName=userFullname;
            req.userData = u;
            return next();
        }
    
        if (userRole === 'SALEPERSON') {
            console.log("Accessed Path:", req.path);
            if (!req.path.startsWith('/')) 
            {
                console.log("access denied")
                return res.status(403).render('error',{msg:'access denied',role:req.userRole});
            }
            console.log("this user is saleperson")
            req.userRole = userRole;
            req.UserName=userFullname;
            req.userData = u;
            return next();
        }
    
        console.log("no role found")
        return res.status(403).render('error',{msg:'no role found',role:req.userRole});
    })
        .catch(err => {
            console.log('Error fetching user from the database: ', err);
            return res.redirect('/users/login');
        });
};

const roleCheckUser = (req, res, next) => {
    console.log('in role check user')
    const user = req.user;
    let userRole; 
    UserModel.findOne({ username: user.username })
    .select('fullname email username role avatar -_id')
    .then(u => {
        if (!u) {
            console.log('User not found in the database');
            return res.redirect('/users/login');
        }
        userRole = u.role
        userFullname = u.fullname
        const methodUsed = req.method;
        console.log(methodUsed)

        if (userRole === 'ADMIN') {
            console.log("this user is admin")
            req.userRole = userRole;
            req.UserName = userFullname;
            req.userData = u;
            return next();
        }
    
        if (userRole === 'SALEPERSON') {
            console.log("Accessed Path:", req.path);
            if ((req.path==='/create')) 
            {
                console.log("access denied")
                return res.status(403).render('error',{msg:'access denied',role:req.userRole});
            }
            console.log("this user is saleperson")
            req.userRole = userRole;
            req.UserName = userFullname;
            req.userData = u;
            return next();
        }
    
        console.log("no role found")
        return res.status(403).render('error',{msg:'access denied',role:req.userRole});
    })
        .catch(err => {
            console.log('Error fetching user from the database: ', err);
            return res.redirect('/users/login');
        });
};

const roleCheck = (req, res, next) => {
    console.log('in role check ')
    const user = req.user;
    let userRole; 
    UserModel.findOne({ username: user.username })
    .then(u => {
        if (!u) {
            console.log('User not found in the database');
            return res.redirect('/users/login');
        }
        userRole = u.role
        userFullname = u.fullname
        const methodUsed = req.method;
        console.log(methodUsed)

        if (userRole === 'ADMIN') {
            console.log("this user is admin")
            req.userRole = userRole;
            req.UserName = userFullname;
            req.userData = u;
            return next();
        }
    
        if (userRole === 'SALEPERSON') {
            console.log("Accessed Path:", req.path);
            if (!(req.path.startsWith('/'))) 
            {
                console.log("access denined")
                return res.status(403).render('error',{msg:'access denied',role:req.userRole});
            }
            console.log("this user is saleperson")
            req.userRole = userRole;
            req.UserName = userFullname;
            req.userData = u;
            return next();
        }
    
        console.log("no role found")
        return res.status(403).render('error',{msg:'no role found',role:req.userRole});
    })
        .catch(err => {
            console.log('Error fetching user from the database: ', err);
            return res.redirect('/users/login');
        });
};

module.exports = {roleCheckProduct,roleCheckOrder,roleCheckUser,roleCheck};
