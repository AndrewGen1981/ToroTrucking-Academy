const express = require('express')
const path = require('path')

const instRouter = express.Router()

// import test objects
const { test1_preTrip_incab } = require('./test1_class_A_incab')
const { test1_preTrip_outcab } = require('./test1_class_A_outcab')


// CONFIG
const admin = require('../config')

function ifInstructor (req, res, next) {
    // check Admin's Auth - if INSTRUCTOR
    const adminId = req.session.userId
    if (admin.checkAdminsAuth(adminId, 'instructor')) { return next() }
    return res.render(path.join(global.__basedir + "/static/general-pages/NEA/NEA.ejs"), { auth: "read or instructor" })
}


instRouter.get('/', ifInstructor, (req, res) => {
    res.send(`
        <h1>Scorings</h1>
        <ul>
            <li><a href='/admin/inst/class-A-incab'>class A in-Cab</a></li>
            <li><a href='/admin/inst/class-A-outcab'>class A out-Cab</a></li>
        </ul>
    `)
})


instRouter.get('/class-A-incab', ifInstructor, (req, res) => {
    res.render(path.join(__dirname + '/test1_pretrip.ejs'), {
        title: 'Class A preTrip Inspection INCAB scoring',
        examiner: admin.findAdminById(req.session.userId),
        test: test1_preTrip_incab
    })
})

instRouter.get('/class-A-outcab', ifInstructor, (req, res) => {
    res.render(path.join(__dirname + '/test1_pretrip.ejs'), {
        title: 'Class A preTrip Inspection OUTCAB scoring',
        examiner: admin.findAdminById(req.session.userId),
        test: test1_preTrip_outcab
    })
})


module.exports = instRouter