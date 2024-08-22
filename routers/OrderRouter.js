const express = require('express')
const Router = express.Router()
const rateLimit = require('express-rate-limit')




const {loginAuth,isLoggedIn} = require('../auth/loginAuth')
const addOrderValidator = require('./Validator/addOrderValidator')
const OrderModel = require('../models/orderModel')
const ProductModel = require('../models/productModel')
const UserModel = require('../models/userModel')
const CustomerModel = require('../models/customerModel')
const {roleCheckOrder} = require('../auth/roleAuth')
const {userStatus} = require('../auth/statusAuth')

const limiter = rateLimit({
    windowMs: 10*1000,
    max: 5,
    message: 'Request too rapidly, please try later'
})

//done
//show all orders
Router.get('/',limiter,loginAuth,isLoggedIn,roleCheckOrder,userStatus,(req,res)=>{
    //orderId,customerName,saler,products,date,totalPrice
    let parts = req.UserName.split(' ')
    let firstName = parts[parts.length -1]
    let avatar = req.userData.avatar

    let productList;
    let salepersonList;
    UserModel.find().select('fullname')
    .then(user =>{
        salepersonList=user
        ProductModel.find()
        .then(products=>{
            productList = products
            OrderModel.find().select('orderId customerName saler products date totalPrice status')
            .then(Orders=>{
                return res.status(200).render('order_manage',
                ({data:Orders,
                    products:productList,
                    salepersons:salepersonList,
                    role:req.userRole,avatar:avatar,firstName:firstName}))
            })
        })
    })
})


//done
//add new order
Router.post('/', limiter, loginAuth, isLoggedIn, roleCheckOrder, userStatus, addOrderValidator, (req, res) => {
    console.log(req.body);
    const { customerName, salespersonId, saleDate, products, customerPhoneNumber, customerAddress } = req.body;
    let newOrder;

    CustomerModel.findOne({ phone_number: customerPhoneNumber })
        .then(customer => {
            if (!customer) {
                const newCustomer = new CustomerModel({
                    full_name: customerName,
                    phone_number: customerPhoneNumber,
                    address: customerAddress
                });
                return newCustomer.save();
            }
            return customer;
        })
        .then(customer => {
            return UserModel.findById(salespersonId).then(salesperson => {
                if (!salesperson) {
                    throw new Error('Salesperson not found');
                }
                return { customer, salesperson };
            });
        })
        .then(({ customer, salesperson }) => {
            return calculateTotalPrice(products).then(totalPriceCount => {
                return Promise.all(products.map(product => {
                    return ProductModel.findByIdAndUpdate(
                        product.productId,
                        { $inc: { quantity: -product.quantity } },
                        { new: true }
                    );
                })).then(() => ({ customer, salesperson, totalPriceCount }));
            });
        })
        .then(({ customer, salesperson, totalPriceCount }) => {
            const formattedSaleDate = saleDate.split('-').join('');
            const customerLastWord = customerName.trim().split(' ').pop();
            const salepersonLastChars = salespersonId.slice(-5);

            const saleDateObj = new Date(saleDate);
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            saleDateObj.setHours(hours, minutes, seconds);

            const orderId = `ORD${formattedSaleDate}${hours}${minutes}${seconds}${customerLastWord}${salepersonLastChars}`;

            newOrder = new OrderModel({
                orderId: orderId,
                customerName,
                saler: salesperson.fullname,
                products: products.map(product => ({
                    productId: product.productId,
                    quantity: product.quantity
                })),
                date: saleDateObj,
                totalPrice: totalPriceCount,
                status: 'Pending'
            });

            return newOrder.save().then(() => customer);
        })
        .then(customer => {
            customer.purchase_history.push(newOrder._id);
            return customer.save();
        })
        .then(() => {
            res.status(200).json({ message: 'Order created and customer saved successfully.' });
        })
        .catch(error => {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});



//done
function calculateTotalPrice(products) {
    const promises = products.map(product => {
        return ProductModel.findById(product.productId)
            .select('retail_price')
            .then(p => {
                return product.quantity * p.retail_price;
            })
            .catch(e => {
                console.log("Product Not Found");
                return 0;
            });
    });

    return Promise.all(promises)
    .then(prices => {
        return prices.reduce((total, price) => total + price, 0);
    })
    .catch(error => {
        console.error('Error calculating total price:', error);
        return 0;
    });
}

//show order by id
Router.get('/:orderId',loginAuth,isLoggedIn,roleCheckOrder,userStatus, (req, res) => {
    OrderModel.findOne({ orderId: req.params.orderId })
        .populate({
            path: 'products.productId',
            model: 'Product'
        })
        .then(order => {
            if (!order) {
                res.status(404).json({ message: 'Order not found' });
                return Promise.reject('Order not found');
            }

            return CustomerModel.findOne({
                purchase_history: {
                    $elemMatch: {
                        orderId: req.params.orderId,
                        full_name: order.customerName
                    }
                }
            }).exec().then(customer => {    
                return UserModel.findOne({ fullname: order.saler }).exec()
                .then(salesperson => {
                    const productsDetails = order.products.map(product => {
                        return {
                            productId: product.productId._id,
                            productName: product.productId.name,
                            quantity: product.quantity,
                            price: product.productId.retail_price
                        };
                    });

                    const responseData = {
                        orderId: order.orderId,
                        customerName: order.customerName,
                        salespersonName: salesperson ? salesperson.fullname : 'N/A',
                        date: order.date,
                        products: productsDetails,
                        totalPrice: order.totalPrice,
                        status: order.status,
                        cashReceive: order.cashReceive || undefined,
                        cashReturn: order.cashReturn || undefined,
                        customerPhone: customer ? customer.phone_number : undefined
                    };

                    return res.status(200).json(responseData);
                });
        });
    })
    .catch(error => {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    });
});


//update order by id
Router.patch('/:orderId',loginAuth,isLoggedIn,roleCheckOrder,userStatus, (req, res) => {
    console.log(req.body)
    const { orderId } = req.params;
    let updateData = req.body;

    let { cashReceive, cashReturn, status } = updateData;
    if (cashReceive === undefined || cashReturn === undefined || status === 'Cancelled') {  
        console.log(cashReceive === undefined)
        console.log(cashReturn === undefined)
        console.log(status === 'Cancelled')
        console.log('Cash return must be 0 or undefined for non-cancelled orders')
        return res.status(400).json({ error: 'Cash return must be 0 or undefined for non-cancelled orders' });
    }
    else
    {
        updateData.status = 'Paid';
        console.log(updateData.status)
    }
    let isOrderCancelled = updateData.status === 'Cancelled';

    OrderModel.findOneAndUpdate({ orderId: orderId }, updateData, { new: true })
        .then(async updatedOrder => {
            if (!updatedOrder) {
                return res.status(404).json({ message: 'Order not found' });
            }

            if (isOrderCancelled) {
                await Promise.all(updatedOrder.products.map(product => {
                    return ProductModel.findByIdAndUpdate(
                        product.productId, 
                        { $inc: { quantity: product.quantity } }, 
                        { new: true }
                    );
                }));
            }

            res.json({ message: 'Order updated successfully', order: updatedOrder });
        })
        .catch(error => {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});

//delete order by id
Router.delete('/:id', limiter, loginAuth, isLoggedIn, roleCheckOrder, userStatus, (req, res) => {
    const orderId = req.params.id;

    OrderModel.findOne({ orderId: orderId })
        .then(order => {
            if (!order) {
                throw new Error('Order not found');
            }
            if (order.status !== 'Cancelled') {
                throw new Error('Order cannot be deleted as it is not cancelled');
            }

            return OrderModel.findOneAndDelete({ orderId: orderId });
        })
        .then(() => {
            return CustomerModel.updateMany(
                { 'purchase_history': orderId },
                { $pull: { 'purchase_history': orderId } }
            );
        })
        .then(() => {
            return res.status(200).json({ message: 'Order successfully deleted and removed from customer histories' });
        })
        .catch(error => {
            console.error('Error:', error);
            return res.status(500).json({ message: error });
        });
});


//forbidden
Router.all('*',(req,res)=>{
  return res.status(404).render('error', { msg: 'Page not found' ,role:req.userRole});
})

module.exports = Router