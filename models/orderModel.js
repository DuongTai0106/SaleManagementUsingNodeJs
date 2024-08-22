const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderSchema = new Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    customerName: {
        type: String,
        required: true
    },
    saler: {
        type: String,
        required: true
    },
    products: [
        {
            productId: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true
            }
        }
    ],
    date: {
        type: Date,
        default: Date.now
    },
    totalPrice: {
        type: Number,
        required: true
    },
    cashReceive: {
        type: Number,
        required: false
    },
    cashReturn: {
        type: Number,
        required: false
    },

    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Processing', 'Paid', 'Cancelled'], 
        default: 'Pending'
    },
});

module.exports = mongoose.model('Order', OrderSchema);