const {check} = require('express-validator')

module.exports = [
    check('email')
      .exists().withMessage('Please insert a valid email')
      .notEmpty().withMessage('Please do not leave the email field empty')
      .isEmail().withMessage('Invalid email address'),
  
    check('fullname')
      .notEmpty().withMessage('Please do not leave the username field empty'),
  
    check('role')
      .optional()
      .isIn(['ADMIN', 'SALEPERSON']).withMessage('Invalid role'),
  ];