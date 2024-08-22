const mgoose = require('mongoose')
const Schema = mgoose.Schema

const AccSchema = new Schema({
    username:{
        type:String,
        unique:true
    },
    email:{
        type:String,
        unique:true
    },
    fullname:String,
    password:String,
    role: String,
    avatar:String,
    isLocked:Boolean
})


module.exports = mgoose.model('User',AccSchema)
