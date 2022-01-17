const express = require('express')
const path = require('path')

const instRouter = express.Router()

// import test objects
const { test1_preTrip } = require('./test1_class_A_pretrip')


// CONFIG
const admin = require('../config')

function ifInstructor (req, res, next) {
    // check Admin's Auth - if INSTRUCTOR
    const adminId = req.session.userId
    if (admin.checkAdminsAuth(adminId, 'instructor')) { return next() }
    return res.render(path.join(global.__basedir + "/static/general-pages/NEA/NEA.ejs"), { auth: "read or instructor" })
}


instRouter.get('/', ifInstructor, (req, res) => {
    res.render(path.join(__dirname + '/test1_pretrip.ejs'), { test: test1_preTrip })
})

module.exports = instRouter
