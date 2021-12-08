const express = require('express')
const app = express()

const path = require('path')

let HTTPDOMAIN

if (process.env.NODE_ENV === 'production') {
    // redirects HTTP to HTTPS
    app.enable('trust proxy')
    app.use((req, res, next) => {
        HTTPDOMAIN = `https://${req.headers.host}${req.url}`
        req.secure ? next() : res.redirect(HTTPDOMAIN)
    })
} else {
    require('dotenv').config() // set .ENV
    HTTPDOMAIN = 'http://localhost'
}


// set the view engine to ejs
app.set('view engine', 'ejs')


app.use(express.static(__dirname+'/'))
// uses URLENCODED for body parsing
app.use(express.urlencoded({ extended: true }))



// MAIN ROUTES
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname+'/main-page/index.html'))
})


// USERS (Applicants and Students) ROUTES
app.use('/user', require('./users/userRouter'),)

// ADMINS ROUTES
app.use('/admin', require('./admin/admin'))



// TODO: create routes for instructors and employers


const PORT = process.env.PORT || 5000
const server = app.listen(PORT, console.log(`${HTTPDOMAIN}:${PORT}`))

// @SOCKET.IO setup for HEROKU: server passed as a parametr to socket constructor to assing a PORT to socket
// PORT has to be different from one APP is listening on
const io = require('socket.io')(server, {
    cors: {
        origin: [`${HTTPDOMAIN}:${PORT}`]       // CORS policy - allowing data exchange between diff. ports
    }
})

// Has to bring in a USER model, just to create a WATCHER with SOCKET inside
const { User } = require('./users/userModel')
// turning on USER changes watch with mongoose
User.watch().on('change', data => {
    io.emit('users-collection-update', data)
})