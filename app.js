require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const path = require('path')
const cookieParser = require('cookie-parser');
const cors = require('cors')


const pRouter = require('./routers/ProductRouter')
const oRouter = require('./routers/OrderRouter')
const uRouter = require('./routers/UserRouter') 
const uCustomer = require('./routers/CustomerRouter') 
const {roleCheck} = require('./auth/roleAuth')
const {loginAuth,isLoggedIn,ifFirstTime} = require('./auth/loginAuth')

const app = express()

app.set('views',path.join(__dirname,'views'))
app.set('view engine','ejs')
app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.use(cookieParser());

app.use(express.static(path.join(__dirname,'public')))
app.use(cors())

app.get('/',loginAuth,isLoggedIn,roleCheck,ifFirstTime,(req,res)=>{
    let parts = req.UserName.split(' ')
    let firstName = parts[parts.length -1]
    let avatar = req.userData.avatar
    return res.status(200).render('index',{role:req.userRole,name:req.UserName,avatar:avatar,firstName:firstName})
})


app.get('/forbidden',loginAuth,isLoggedIn,roleCheck,(req,res)=>{
    let parts = req.UserName.split(' ')
    let firstName = parts[parts.length -1]
    let avatar = req.userData.avatar
    console.log('is redirect here')
    return res.status(404).render('error',{msg:'access denied',role:req.userRole,name:req.UserName,avatar:avatar,firstName:firstName})
})

app.use('/products',pRouter)
app.use('/orders',oRouter)
app.use('/users',uRouter)
app.use('/customers',uCustomer)
app.all('*',(req,res)=>{
    res.status(404).render('error',{msg:'page not found',role:req.userRole})
})


mongoose.connect('mongodb://127.0.0.1:27017',{
    //useNewUrlParser:true,
    //useUnifiedTopology: true
}).then(()=>{
    const PORT = process.env.PORT || 8088
    app.listen(PORT,()=>console.log('http://localhost:'+PORT))
}).catch(e=>console.log('error: '+e.message))