const express = require('express')
const {validationResult} = require('express-validator')
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const Router = express.Router()
const path = require('path')
const multer = require('multer');
const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });
const fs = require('fs');
const rateLimit = require('express-rate-limit')

require('dotenv').config()

const registerValidator = require('./Validator/registerValidator')
const loginValidator = require('./Validator/loginValidator')
const verifyPasswordValidator = require('./Validator/verifyPasswordValidator')
const UserModel = require('../models/userModel')
const {loginAuth,isLoggedIn} = require('../auth/loginAuth')
const {roleCheckUser} = require('../auth/roleAuth')
const {userStatus} = require('../auth/statusAuth')



const limiter = rateLimit({
    windowMs: 10*1000,
    max: 5,
    message: 'Request too rapidly, please try later'
})

Router.get('/',loginAuth,isLoggedIn,roleCheckUser,userStatus,(req,res)=>{
    let parts = req.UserName.split(' ')
    let firstName = parts[parts.length -1]
    let avatar = req.userData.avatar

    let role = req.userRole
    UserModel.find({}, 'fullname avatar isLocked email')
        .then(users => {
            return res.status(200).render('staff_manage', {
                role: role,
                users: users ,
                avatar:avatar,
                firstName:firstName
            });
        })
        .catch(error => {
            console.error('Error fetching users:', error);
            return res.status(500).render('error', {
                message: 'Error fetching users data',
                role: role
            });
        });
})

Router.post('/',limiter,loginAuth,isLoggedIn,roleCheckUser,userStatus,(req,res)=>{
    let userId = req.body.id

    UserModel.findById(userId)
    .then(user=>{
        return res.status(200).json({data:user})
    }).catch(e=>{
        return res.status(404)
    })
})

Router.put('/',limiter,loginAuth,isLoggedIn,roleCheckUser,userStatus,(req,res)=>{
    let userId = req.body.userId

    UserModel.findById(userId)
    .select('isLocked')
    .then(user=>{
        console.log(user.isLocked)
        user.isLocked = !user.isLocked;
        return user.save();
    }).then(result=>{
        console.log(result)
        return res.status(200).json({msg:'success'})
    }).catch(e=>{
        return res.status(404).json({msg:'failed'})
    })
})

//done
Router.get('/login',limiter,(req,res)=>{
    if (req.cookies.authCookie)
    {
        return res.redirect('/')
    }
    return res.status(200).render('signin',{ErrorMessage:'',oldInput:''})
})

//done
Router.post('/login',limiter,loginValidator, (req, res) => {
    let result = validationResult(req)
    if (result.errors.length===0)
    {
        let {username, password} = req.body
        let account = undefined
        UserModel.findOne({username:username})
        .then(acc =>{
            if (!acc){
                return res.status(401).render('signin',{ErrorMessage:"Username is not existed",oldInput:req.body.username})
            }
            account = acc
            return bcrypt.compare(password,acc.password)
        }).then(passwordMatch=>{
            if (!passwordMatch)
            {
                return res.status(401).render('signin',{ErrorMessage:"username or password is not correct",oldInput:req.body.username})
            }

            const {JWT_SECRET} = process.env
            
            
            jwt.sign({
                username: account.username,
                status:account.isLocked
            }, JWT_SECRET,{
                expiresIn: '15m'
            }, (err,token) => {
                if (err) throw err
                res.cookie('authCookie',token,{ secure: true , sameSite: 'strict' })
                return res.redirect('/')
            })

        }).catch(e=>{
            return res.status(401).render('signin',{ErrorMessage:"Login failed: "+e.message,oldInput:req.body.username})
        })
    } else {
        let messages = result.mapped();
        let msg = '';
        for (m in messages) {
            
            msg=messages[m];
            break;
        }
        return res.status(401).render('signin',{ErrorMessage:"Login failed: "+msg.msg,oldInput:req.body.username})
    }
});

//done
Router.get('/logout',limiter,(req,res)=>{
    res.clearCookie('authCookie')
    return res.redirect('/users/login');
})

//done
Router.post('/logout',limiter,(req,res)=>{
    res.clearCookie('authCookie')
    return res.redirect('/users/login');
})

//done
Router.get('/update',limiter,loginAuth,isLoggedIn,roleCheckUser,userStatus,(req,res)=>{
    UserModel.findOne({username:req.user.username})
    .then(acc =>{
        return bcrypt.compare(req.user.username,acc.password)
    }).then(passwordMatch=>{
        
        if (passwordMatch&&role==='ADMIN')
        {
            req.isPwdChanged=true
        }
        else if (!passwordMatch)
        {
            req.isPwdChanged=true
        }

        let force=!req.isPwdChanged;
        if (req.userRole==='ADMIN')
        {
            force = false
        }
        
        console.log(req.path+' force = '+force)
        return res.status(200).render('changepwd',{force:force,msg:''})
    })
})

//done
Router.post('/update',limiter,loginAuth,isLoggedIn,roleCheckUser,verifyPasswordValidator,userStatus,(req,res)=>{
    let result = validationResult(req)
    console.log(req.body)
    if (result.errors.length===0)
    {
        const force = !req.isPwdChanged

        console.log(req.path+' force = '+force)
        const username = req.user.username;
        let data = username
        const newPassword = req.body.password;

        if (newPassword)
        {
            data=newPassword
        }
        UserModel.findOne({username:username})
        .then(acc =>{
            return bcrypt.compare(data,acc.password)
        }).then(passwordMatch=>{
            if (!passwordMatch)
            {
                return bcrypt.hash(newPassword, 10)
                        .then(hashedPassword => {
                            return UserModel.findOneAndUpdate({ username: username },{ password: hashedPassword }, { new: true });
                        })
                        .then(() => {
                            console.log('Success')
                            req.isPwdChanged=true
                            return res.redirect('/')
                        });
            }
            console.log('failed - password existed')
            return res.render('changepwd',{force:force,msg:'Please enter another password'})
        }).catch(e=>{
            console.log('failed - error')
            return res.render('changepwd',{force:force,msg:'Error: '+e.message})
        })
    }
    else
    {
        let messages = result.mapped();
        let msg = '';
        for (m in messages) {
            msg=messages[m];
            break;
        }
        return res.render('changepwd',{force:force,msg:'Error: '+msg.msg})
    }
    
})

//done
Router.get('/profile',limiter,loginAuth,isLoggedIn,roleCheckUser,userStatus,(req,res)=>{
    let parts = req.UserName.split(' ')
    let firstName = parts[parts.length -1]
    let avatar = req.userData.avatar

    let user ;
    user = req.user.username
    let account = undefined
    UserModel.findOne({username:user})
    .select('role fullname email isLocked avatar -_id')
    .then(acc =>{
        if (!acc){
            return res.status(404).render('error', { msg: 'User not found' });
        }
        account = acc
        return res.status(200).render('profile_manage',{u:account,role:req.userRole,avatar:avatar,firstName:firstName})
    }).catch(e=>{
        return res.status(500).render('error', { msg: 'Internal Server Error: '+e });
    })
})

//done
Router.post('/profile',limiter,loginAuth,isLoggedIn,roleCheckUser,userStatus,upload.single('avatar'),(req,res)=>{
    let parts = req.UserName.split(' ')
    let firstName = parts[parts.length -1]
    let avatar = req.userData.avatar

    const { Fullname, Email } = req.body;
    const user = req.user.username
    let img = undefined;
    UserModel.findOne({username:user})
    .then(acc =>{
        console.log(acc)
        if (!acc)
        {
            return res.status(404).render('error', { msg: 'User not found' });
        }
        if (req.file) {
            img = req.file.buffer.toString('base64');
        }
        else
        {
            img = acc.avatar
        }
        return UserModel.findOneAndUpdate(
            { username:user },
            { $set: { fullname: Fullname, email: Email ,avatar: img} },
            { new: true}
        );
    }).then(updatedUser => {
        console.log(updatedUser)
        if (!updatedUser) {
            return res.status(404).render('error', { msg: 'User not found' });
        }
        return res.status(200).render('profile_manage', { u: updatedUser ,role:req.userRole,avatar:avatar,firstName:firstName});
    }).catch(e=>{
        console.log('profile - error')
        return res.status(500).render('error', { msg: 'Internal Server Error: ' + e });
    })    
})


//done
Router.get('/create',limiter,loginAuth,isLoggedIn,roleCheckUser,userStatus,(req,res)=>{

    let parts = req.UserName.split(' ')
    let firstName = parts[parts.length -1]
    let avatar = req.userData.avatar
    
    return res.status(200).render('signup',{ErrorMessage:'',oldInputU:'',oldInputE:'',role:req.userRole ,avatar:avatar,firstName:firstName})
})

//done
Router.post('/create',limiter,loginAuth,isLoggedIn,roleCheckUser,userStatus,registerValidator, (req, res) => {
    let result = validationResult(req)
    if (result.errors.length===0)
    {
        let {email, fullname, role} = req.body
        let username,password;
        let defaultAvatar
        email = email.toLowerCase();
        UserModel.findOne({ email: email })
        .then(acc =>{
            if (acc){
                return res.status(401).render('signup', { ErrorMessage: 'this account is existed' ,oldInputU:req.body.fullname,oldInputE:req.body.email,role:req.userRole});
            }
            if (role!='ADMIN')
            {
                role='SALEPERSON'
            }

            const imagePath = path.join(__dirname, '../public/images/user.jpg'); 
            console.log(imagePath)
            const imageAsBase64 = fs.readFileSync(imagePath, 'base64');
            defaultAvatar =`${imageAsBase64}`

            const parts = email.split('@')

            username = parts[0]
            password = parts[0]

        })
        .then(()=>bcrypt.hash(password, 10))
        .then(hashed =>{
            let user = new UserModel({
                email: email,
                username:username,
                fullname:fullname,
                password:hashed,
                role: role,
                avatar:defaultAvatar,
                isLocked:false
            })
        return user.save();

        }).then(()=>{
            
            return res.redirect('/users/')
        }).catch(e=>{
            return res.status(401).render('signup', { ErrorMessage: e.message ,oldInputU:req.body.fullname,oldInputE:req.body.email,role:req.userRole});
        })
    } else {
        let messages = result.mapped();
        let msg = '';
        for (m in messages) {
            msg=messages[m];
            break;
        }
        return res.status(401).render('signup',{ErrorMessage:"register failed: "+msg.msg,oldInputU:req.body.fullname,oldInputE:req.body.email,role:req.userRole})
    }
});

//done
Router.all('*',(req,res)=>{
    return res.status(404).render('error', { msg: 'Page not found' ,role:req.userRole});
})

module.exports = Router



