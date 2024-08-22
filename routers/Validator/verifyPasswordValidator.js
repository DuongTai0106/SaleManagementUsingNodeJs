const {check} = require('express-validator')

module.exports = [
    check('password')
        .exists().withMessage('Please insert a valid password')
        .notEmpty().withMessage('Please do not leave the password field empty'),

    check('re_password')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
  ];