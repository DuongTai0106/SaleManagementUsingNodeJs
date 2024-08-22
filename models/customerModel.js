const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CustomerSchema = new Schema({
    full_name: {
        type: String,
        required: true
    },
    phone_number: {
        type: String,
        required: true,
        unique: true
    },
    address: {
        type: String,
        required: false
    },
    creation_date: {
        type: Date,
        default: Date.now
    },
    purchase_history: [
        {
            type: String,
            ref: 'Order'
        }
    ]
});

module.exports = mongoose.model('Customer', CustomerSchema);
