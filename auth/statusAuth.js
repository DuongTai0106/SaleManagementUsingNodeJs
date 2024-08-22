const userStatus = (req, res, next) => {
    const user = req.user;
    console.log('in user status')
    if (user.status==='Locked')
    {
        return res.redirect('/forbidden')
    }
    else
    {
        next()
    }
}

module.exports = {userStatus}