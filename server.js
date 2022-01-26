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

// saving ROOT DIR into globals to use in other routes
global.__basedir = __dirname

// set the view engine to ejs
app.set('view engine', 'ejs')


app.use(express.static(__dirname+'/'))
// uses URLENCODED for body parsing
app.use(express.urlencoded({ extended: true }))



// MAIN ROUTES
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname+'/main-page/index.html'))
})

app.get('/catalog', async(req, res) => {
    res.sendFile(path.join(__dirname+'/static/catalog/Toro Catalog WA 2021 Dec17.pdf'))
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

// Has to bring in a MODELS here, just to create a WATCHER with SOCKET inside
const { User, Student, tools } = require('./users/userModel')       // tools for timetest, can be deleted after solving
const { dataCollectionForm } = require('./users/applicants/form1Model')
const { applicationForm } = require('./users/applicants/form2Model')
const { agreementForm } = require('./users/applicants/form3Model')
const { Tuition } = require('./users/tuition/tuitionModel')
// turning on USER changes watch with mongoose
User.watch().on('change', data => {
    io.emit('users-collection-update', data)
})
Student.watch().on('change', data => {
    io.emit('students-update', data)
})
dataCollectionForm.watch().on('change', data => {
    io.emit('dataCollections-update', data)
})
applicationForm.watch().on('change', data => {
    io.emit('applications-update', data)
})
agreementForm.watch().on('change', data => {
    io.emit('agreements-update', data)
})
Tuition.watch().on('change', data => {
    io.emit('tuition-update', data)
})



// TEST can be deleted
app.get('/timetest', (req, res) => {

    let html = ''
    

    for (let i=0; i<25; i++) {
        let hh = i<10 ? `0${i}` : `${i}`

        let date = `2022-01-26T${hh}:00:00`
        let key = tools.getDatePrefix(new Date(date))
        let keyCeil = tools.getDatePrefixCeil(new Date(date))

        let timezone = new Date(date).getTimezoneOffset()
        let timezoneOffset = (12*60 - new Date(date).getTimezoneOffset()) * 60000

        html += `<p>${date} ${key} CEIL ${keyCeil} timezone ${timezone}m(${timezone / 60}h), timezoneOffset ${timezoneOffset}ms (${timezoneOffset/3600000}h) </p>`
    }

    for (let i=0; i<25; i++) {
        let hh = i<10 ? `0${i}` : `${i}`

        let date = `2022-01-27T${hh}:00:00`
        let key = tools.getDatePrefix(new Date(date))
        let keyCeil = tools.getDatePrefixCeil(new Date(date))

        let timezone = new Date(date).getTimezoneOffset()
        let timezoneOffset = (12*60 - new Date(date).getTimezoneOffset()) * 60000

        html += `<p>${date} ${key} CEIL ${keyCeil} timezone ${timezone}m(${timezone / 60}h), timezoneOffset ${timezoneOffset}ms (${timezoneOffset/3600000}h) </p>`
    }

    res.send(html)

})