const express = require('express')
const path = require('path')

instRouter = express.Router()

// import test objects
const { test1_preTrip } = require('./test1_class_A_pretrip')

instRouter.get('/', (req, res) => {
    res.render(path.join(__dirname + '/test1_preTrip.ejs'), { test: test1_preTrip })
})

module.exports = instRouter