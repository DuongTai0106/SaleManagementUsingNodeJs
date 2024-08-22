const express = require('express')
const Router = express.Router()
const {validationResult} = require('express-validator')
const rateLimit = require('express-rate-limit')


const addProductValidator = require('./Validator/addProductValidator')
const Product = require('../models/productModel')
const Order = require('../models/orderModel')
const {loginAuth,isLoggedIn} = require('../auth/loginAuth')
const {roleCheckProduct} = require('../auth/roleAuth')
const {userStatus} = require('../auth/statusAuth')


const limiter = rateLimit({
    windowMs: 10*1000,
    max: 5,
    message: 'Request too rapidly, please try later'
})

//done
//show all products in store
Router.get('/',limiter,loginAuth,isLoggedIn,roleCheckProduct,userStatus,(req,res)=>{
    let parts = req.UserName.split(' ')
    let firstName = parts[parts.length -1]
    let avatar = req.userData.avatar

    const role = req.userRole
    let selection = ''
    if (role==='ADMIN')
    {
      selection = 'name import_price retail_price category creation_date quantity'
    }
    else if (role==='SALEPERSON')
    {
      selection = 'name retail_price category creation_date quantity'
    }

    Product.find().select(selection)
    .then(products=>{
      if (products && products.length > 0) {
        return res.status(200).render('product_manage', { products: products, role: role,avatar:avatar,firstName:firstName});
      } else {
          return res.status(200).render('product_manage', { products: [], role: role,avatar:avatar,firstName:firstName});
      }
    }).catch(error => {
      console.error('Error fetching products:', error);
      return res.status(404).render('error', { msg: 'No Products found' ,role:req.userRole});
    });
})

//done
//add product
Router.post('/',limiter,loginAuth,isLoggedIn,roleCheckProduct,userStatus,addProductValidator,(req,res)=>{
    let result = validationResult(req.body)
    if (result.errors.length===0)
    {
        
        const {name, import_price, retail_price, category ,quantity} = req.body
        //console.log(name, import_price, retail_price, category, creation_date,quantity)

        Product.findOne({name, category})
        .then((existingProduct) => {
            if (existingProduct) {
              existingProduct.quantity = parseInt(quantity, 10) + parseInt(existingProduct.quantity,10);
              existingProduct.retail_price=retail_price;
              existingProduct.import_price=import_price;
              return existingProduct.save()
                .then((updatedProduct) => {
                  console.log('product exist and update quantity')
                  return res.status(200).json({ message: 'Product received and processed' });
                });
            }
            else 
            {
                let product = new Product({
                    name, import_price, retail_price, category,quantity
                })
                product.save()
                .then(e=>{
                  console.log('product added')
                  return res.status(200).json({ message: 'Product received and processed' });
                  //return res.redirect('/products')
                })
            }
        }).catch(e=>{
            console.error('Error fetching products:', e);
            return res.status(404).json({code:1,message:e})
        })
    }
    else
    {
        let messages = result.mapped()
        let msg = ''
        for (m in messages)
        {
            msg = messages[m]
            break;
        }
        res.json({code:1,message:msg})
    }
})


//update all product's attributes by id
Router.put('/', limiter, loginAuth, isLoggedIn, roleCheckProduct,userStatus, async (req, res) => {
  console.log(req.body);
  try {
      const { id, productName, purchasePrice, retailPrice, category, quantity } = req.body;

      Product.findByIdAndUpdate(
          id,
          { name:productName, import_price:purchasePrice, retail_price:retailPrice, category, quantity },
          { new: true }
      ).then(updatedProduct => {
          if (updatedProduct) {
              console.log('success');
              console.log(updatedProduct);
              res.json({ code: 0, message: 'Product updated successfully' });
          } else {
            console.log('not found product');
              res.json({ code: 1, message: 'Product not found' });
          }
      }).catch(error => {
        console.log('error');
          res.json({ code: 2, message: error.message });
      });

  } catch (error) {
    console.log(error);
      res.json({ code: 2, message: error.message });
  }
});

//delete product by id
Router.delete('/', limiter, loginAuth, isLoggedIn, roleCheckProduct, userStatus, async (req, res) => {
  console.log(req.body.id);
  const productId = req.body.id;

  try {
      const product = await Product.findById(productId);
      if (!product) {
        console.log('products not exist');
          return res.status(200).json({ code: 1, message: 'Product not found' });
      }

      const inAnyOrder = await Order.find({ 'products.productId': productId });
      if (inAnyOrder.length > 0) {
          console.log('products in order');
          return res.status(200).json({ code: 2, message: 'Product is existed in some orders, cannot be deleted' });
      }

      await Product.findByIdAndDelete(productId);
      console.log('success');
      res.json({ code: 0, message: 'Product deleted successfully' });

  } catch (error) {
    console.log(error);
      res.status(500).json({ code: 2, message: error.message });
  }
});


//forbidden 
Router.all('*',(req,res)=>{
  return res.status(404).render('error', { msg: 'Page not found' ,role:req.userRole});
})

module.exports = Router