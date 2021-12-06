// Handles all dmin/students routes
// used in ADMIN.JS

const express = require('express')
const studentRouter = express.Router()
const path = require('path')


studentRouter.get('/', (req, res) => {
    res.send('Student Data')
})




module.exports = studentRouter