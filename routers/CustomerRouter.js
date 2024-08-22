const express = require('express')
const {validationResult} = require('express-validator')
const Router = express.Router()
const path = require('path')
const rateLimit = require('express-rate-limit')

require('dotenv').config()

const {loginAuth,isLoggedIn} = require('../auth/loginAuth')
const {roleCheckUser} = require('../auth/roleAuth')
const {userStatus} = require('../auth/statusAuth')
const CustomerModel = require('../models/customerModel')
const OrderModel = require('../models/orderModel')
const ProductModel = require('../models/productModel')
const limiter = rateLimit({
    windowMs: 10*1000,
    max: 5,
    message: 'Request too rapidly, please try later'
})

Router.get('/',loginAuth,isLoggedIn,roleCheckUser,userStatus,(req,res)=>{
    let parts = req.UserName.split(' ')
    let firstName = parts[parts.length -1]
    let avatar = req.userData.avatar

    CustomerModel.find().then(customers=>{
        return res.status(200).render('customer_manage',({role:req.userRole,avatar:avatar,firstName:firstName,customers:customers}))
    })
})

Router.get('/:phone_number', loginAuth, isLoggedIn, roleCheckUser, userStatus, (req, res) => {
    const phone_number = req.params.phone_number;
    CustomerModel.findOne({ phone_number })
        .populate({
            path: 'purchase_history',
            populate: {
                path: 'products.productId',
                model: 'Product'
            }
        })
        .then(customer => {
            if (!customer) {
                return res.status(404).send('Customer not found');
            }

            const formattedData = customer.purchase_history.map(order => ({
                orderId: order.orderId,
                date: order.date,
                totalPrice: order.totalPrice,
                products: order.products.map(product => ({
                    productName: product.productId.name,
                    quantity: product.quantity
                }))
            }));

            return res.status(200).json(formattedData);
        })
        .catch(error => {
            console.error(error);
            return res.status(500).send(error.message);
        });
});



Router.all('*',(req,res)=>{
    return res.status(404).render('error', { msg: 'Page not found' ,role:req.userRole});
})

module.exports = Router
