// This router module will be used for users (applicants, students and etc.) account creating
// for admin, instuctors and Users other routes will be created

const express = require('express')
const session = require('express-session')

const { body, validationResult } = require('express-validator')
const registErrorObj = { isThere: false, errors: [] }

const path = require('path')
const bcrypt = require('bcrypt')


// node-fetch from v3 is an ESM-only module - you are not able to import it with require().
// If you cannot switch to ESM, please use v2
// npm install node-fetch@2
// const fetch = require('node-fetch')


// MONGO db via MONGOOSE
const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI_USERS)

// MODELS for mongoose
const { User } = require('./userModel')
const { dataCollectionForm, getForm1Object } = require('./applicants/form1Model')
const { applicationForm, getForm2Object } = require('./applicants/form2Model')
const { agreementForm, getForm3Object } = require('./applicants/form3Model')


// for forms filling out tracking
const applicantProgress = {
    form1: false,
    form2: false,
    form3: false
}

// POSTMAN and messages
const { getInfoMessage, getIssueMessage } = require('./_messages')
const postman = require('./postman/postman')


// @SESSION setup
const SESS_DURATION = 1000 * 60 * 30    //  30 minutes for Applicats and Students

// extracting from process.env
const {
    NODE_ENV = 'development',

    SESS_NAME = 'sid',
    SESS_SECRET = 'TOROTruckingAcademy2021!',
    SESS_LIFETIME = SESS_DURATION
} = process.env

const IN_PROD = NODE_ENV === 'production'


const userRouter = express.Router()

// adding session configuration
userRouter.use(session({
    name: SESS_NAME,
    resave: false,
    saveUninitialized: false,
    secret: SESS_SECRET,
    cookie: {
        maxAge: SESS_LIFETIME,
        sameSite: true,
        secure: IN_PROD
    }
}))


// middleware
function redirectToLogin (req, res, next) {
    // if user is NOT logged in, then redirect user to Login page
    if (!req.session.userId) {
        res.redirect('/user/login')
    } else { next() }
}
function redirectToHome (req, res, next) {
    // if user is logged in, then redirect user to Home page
    if (req.session.userId) {
        res.redirect('/user/home')
    } else { next() }
}
userRouter.use(async (req, res, next) => {   // !!! general middleware - will be used before EACH ROUTE!!!
    if (req.session.userId) {   // if there is one, then tries to find it in users array and inject it to LOCALS - spec.obj. for sharing data between functions
        res.locals.user = await User.findOne({ email: req.session.userId })
        res.locals.user.applicantProgress = applicantProgress
    }
    next()
})




// *ROUTES FOR USERS (applicants and Students)

// @GET REQUESTS
userRouter.get('/', (req, res) => {
    res.render(path.join(__dirname+'/welcome.ejs'), sess = req.session)
})

userRouter.get('/home', redirectToLogin, async(req, res) => {

    if (!applicantProgress.form1) {     //  check if form1 is filled out. One time check
        applicantProgress.form1 = await dataCollectionForm.exists({ email: req.session.userId })
    }
    if (!applicantProgress.form2 && applicantProgress.form1) {     //  check if form2 is filled out. One time check, but only after form1 = true
        applicantProgress.form2 = await applicationForm.exists({ email: req.session.userId })
    }
    if (!applicantProgress.form3 && applicantProgress.form1 && applicantProgress.form2) {     //  check if form3 is filled out. One time check, but only after form1 = true & form2 = true
        applicantProgress.form3 = await agreementForm.exists({ email: req.session.userId })
    }

    // checking for income messages
    const { status, e, obj } = req.query

    res.locals.user.msg = status === 'issue' ? { class: 'issue', txt: getIssueMessage(e), e }
    : status === 'ok' ? { class: 'success', txt: getInfoMessage(e), e }
    : status === 'info' ? { class: 'info', txt: getInfoMessage(e), e }
    : { class: 'info', txt: "Wellcome back" }

    res.render(path.join(__dirname+'/home.ejs'), { user :  res.locals.user } )
})

userRouter.get('/login', redirectToHome, (req, res) => {
    // checking for income messages
    const { status, e } = req.query

    res.render(path.join(__dirname+'/login.ejs'), {
        error: status === 'issue' ? getIssueMessage(e) : false,
        info: status === 'info' ? getInfoMessage(e) : false,
        registErrorObj
    })
})

userRouter.get('/register', redirectToHome, (req, res) => {
    res.render(path.join(__dirname+'/register.ejs'), { registErrorObj })
})


// @POST REQUESTS
userRouter.post('/login', redirectToHome, async (req, res) => {
    const { email, password } = req.body
    if (email && password) {
        const user = await User.findOneAndUpdate({ email }, { lastSESS: new Date }) // updating last session time
        if (!user) {    //  no user with such an email
            return res.status(400).redirect('/user/login?status=issue&e=wrongUserOrPassword')  // can not find a user
        }
        try {
            if (await bcrypt.compare(password, user.password)) {
                req.session.userId = email
                
                // this will force forms list to reread
                applicantProgress.form1 = false
                applicantProgress.form2 = false
                applicantProgress.form3 = false

                return res.redirect('/user/home')
            }
        } catch(e) { res.status(500).send() }
    } 
    res.status(400).redirect('/user/login?status=issue&e=wrongUserOrPassword')  // wrong password
})


userRouter.post('/register', redirectToHome, body("email")
    .isLength({ min: 1 }).trim().withMessage("Email must be specified")
    .isEmail().withMessage("Email must be a valid email address")
    .custom( (value) => {
        return User.findOne({email : value}).then((user) => {
            if (user) {
                return Promise.reject("Email already in use");
            }
        })
    }),    
    body('password').isLength({ min: 5 }).withMessage("Minimum length is 5 symbols"),     // password must be at least 5 chars long
    async (req, res) => {
    
    // Finds the validation errors in this request and wraps them in an object with handy functions
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        registErrorObj.isThere = true
        registErrorObj.errors = errors.array()
        return res.status(400).redirect('/user/register')
    }

    // Request is ok, can create a user
    // clearning errors
    registErrorObj.isThere = false
    registErrorObj.errors = []

    const { name, email, password } = req.body
    const token = postman.generateAToken()      //  as default token was "not sent", now it will be generated automatically

    // creating token link depends on is in production
    const tokenLink = IN_PROD ?
    `https://${req.headers.host}/user/token/${token}` :     // should be HTTPS for Production
    `http://${req.headers.host}/user/token/${token}`        // should be HTTP for Dev

    try {
        // SAVING to a USERs collection
        new User({                  
                name,
                email,
                password: await bcrypt.hash(password, 10),   // hashing password, salt 10
                token                               // TODO: hash it
            }).save().then(async(newUser) => {
                // saving is OK
                postman.sendATokenLetter(name, email, token, tokenLink)     // #1 Sending a token-letter
                req.session.userId = newUser.email                          // #2 Saving for short-cut in session object to notify software that we have logged in user

                return res.status(200).redirect('/user/home?status=info&e=verTokenSent')    // #3 redirects to HOME with token sent notification
            })
        }
    catch(e) {
        return res.status(500).send("Server error, try later please...", e.message)
    }
})

userRouter.post('/logout', redirectToLogin, (req, res) => {
    // forcing forms rereading in case of log out and back again with other user credentials
    applicantProgress.form1 = false
    applicantProgress.form2 = false
    applicantProgress.form3 = false
    // deleting session 
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/user/home')
        }
    })
    res.clearCookie(SESS_NAME)
    res.redirect('/user/login')
})



// *REQUESTS for applicants



userRouter.get('/form1', redirectToLogin, (req, res) => {
    res.render(path.join(__dirname+'/applicants/form1.ejs'), {exists: applicantProgress.form1})
})
userRouter.get('/form2', redirectToLogin, async(req, res) => {
    form1 = await dataCollectionForm.findOne({ email: req.session.userId })
    if (form1) { res.render(path.join(__dirname+'/applicants/form2.ejs'), {form1, exists: applicantProgress.form2}) }
    else { res.redirect('/user/home?status=issue&e=form1Read') }
})
userRouter.get('/form3', redirectToLogin, async(req, res) => {
    form1 = await dataCollectionForm.findOne({ email: req.session.userId })
    if (form1 && applicantProgress.form2) { res.render(path.join(__dirname+'/applicants/form3.ejs'), {form1, exists: applicantProgress.form3}) }
    else { res.redirect('/user/home?status=issue&e=form1Read') }
})


userRouter.post('/form1', redirectToLogin, (req, res) => {
    // checking if exists
    if (applicantProgress.form1) {
        return res.redirect('/user/home?status=issue&e=formAlreadyExists')
    }

    const form1Object = getForm1Object(req.body, req.session.userId)
    if (form1Object) {
        try {
            new dataCollectionForm(form1Object)
            .save()
            .then(async(newForm) => {
                applicantProgress.form1 = true
                
                await User.findOneAndUpdate({ email: req.session.userId }, { dataCollection: newForm._id })        // saving backlink in User model
                
                res.redirect('/user/home?status=ok&e=okForm1')
            })
        } catch(e) {
            console.log(e)
            res.redirect('/user/home?status=issue&e=savingIssue')
        }
    } else {
        res.redirect('/user/home?status=issue&e=dataIssue')
    }
})


userRouter.post('/form2', redirectToLogin, (req, res) => {
    // checking if exists
    if (applicantProgress.form2) {
        return res.redirect('/user/home?status=issue&e=formAlreadyExists')
    }

    const form2Object = getForm2Object(req.body, req.session.userId)
    if (form2Object) {
        try {
            new applicationForm(form2Object)
            .save()
            .then(async(newForm) => {
                applicantProgress.form2 = true

                await User.findOneAndUpdate({ email: req.session.userId }, { application: newForm._id })        // saving backlink in User model

                res.redirect('/user/home?status=ok&e=okForm2')
            })
        } catch(e) {
            console.log(e)
            res.redirect('/user/home?status=issue&e=savingIssue')
        }
    } else {
        res.redirect('/user/home?status=issue&e=dataIssue')
    }
})


userRouter.post('/form3', redirectToLogin, (req, res) => {
    // checking if exists
    if (applicantProgress.form3) {
        return res.redirect('/user/home?status=issue&e=formAlreadyExists')
    }

    const form3Object = getForm3Object(req.body, req.session.userId)
    if (form3Object) {
        try {
            new agreementForm(form3Object)
            .save()
            .then(async(newForm) => {
                applicantProgress.form3 = true

                await User.findOneAndUpdate({ email: req.session.userId }, { agreement: newForm._id })        // saving backlink in User model

                res.redirect('/user/home?status=ok&e=okForm3')
            })
        } catch(e) {
            console.log(e)
            res.redirect('/user/home?status=issue&e=savingIssue')
        }
    } else {
        res.redirect('/user/home?status=issue&e=dataIssue')
    }
})



// @PASSWORDs routes

userRouter.post('/password', redirectToLogin, async (req, res) => {
    // user is authorized, otherwise they will be redirected to LOGIN with middleware
    const { currentPassword, newPassword } = req.body
    const email = req.session.userId

    if(!email) { return  res.status(400).redirect('/user/login?status=issue&e=sessionTimeout')}
    if(!currentPassword) { return  res.status(400).redirect('/user/home?status=issue&e=blankCurrentPassw')}
    if(!newPassword) { return  res.status(400).redirect('/user/home?status=issue&e=blankNewPassword')}
    if(newPassword.length < 5) { return  res.status(400).redirect('/user/home?status=issue&e=newPasswLen')}
    if(currentPassword === newPassword) { return  res.status(400).redirect('/user/home?status=issue&e=equalCurrentNew')}

    // checking if current password passed id valid
    const user = await User.findOne({ email })
    if (!user) { return res.status(400).redirect('/user/login?status=issue&e=sessionTimeout')}

    try {
        if (await bcrypt.compare(currentPassword, user.password)) {
            const user = await User.findOneAndUpdate({ email }, { password: await bcrypt.hash(newPassword, 10) })
            postman.sendNewPasswordLetter(user.name, email, newPassword, 'change')
            // req.session.userId = email           DO I need this here?
            return res.redirect('/user/home?status=info&e=passwChanged')   //  successfuly updated
        }
        return res.status(400).redirect('/user/home?status=issue&e=wrongCurrentPassw')
    } catch(e) { res.status(500).send("Server error, try later please...") }
 
})


userRouter.post('/passwordreset', redirectToHome, body("email")
    .isLength({ min: 1 }).trim().withMessage("Email must be specified")
    .isEmail().withMessage("Email must be a valid email address")
    .custom( (email) => {
        return User.findOne({ email }).then((user) => {
            if (!user) {
                return Promise.reject(`There is no user with ${email} in our database`)
            }
        })
    }), async(req, res) => {
    
    // user has to provide us with personal login-email
    const errors = validationResult(req);       // is email valid and is it a login? via 'express-validator'
    if (!errors.isEmpty()) {
        registErrorObj.isThere = true
        registErrorObj.errors = errors.array()
        return res.status(400).redirect('/user/login')
    }

    // Request is ok, can create a user
    // clearning errors
    registErrorObj.isThere = false
    registErrorObj.errors = []

    const { email } = req.body

    // Reseting Password
    const newPassword = postman.generateNewPassword()
    try {
        const user = await User.findOneAndUpdate({ email }, { password: await bcrypt.hash(newPassword, 10) })
        postman.sendNewPasswordLetter(user.name, email, newPassword, 'reset')
        res.status(200).redirect('/user/login?status=info&e=passwEmailed')
    } catch(e) {
        console.log(e)
        res.status(500).redirect('/user/login?status=issue&e=savingIssue')
    }

    
})


// WORKING with TOKENS
userRouter.post('/sendToken', redirectToLogin, async (req, res) => {
    const { name, email } = req.body
    if (email) {

        const token = postman.generateAToken()

        // creating token link depends on is in production
        const tokenLink = IN_PROD ?
        `https://${req.headers.host}/user/token/${token}` :     // should be HTTPS for Production
        `http://${req.headers.host}/user/token/${token}`        // should be HTTP for Dev
 
        try {
            if ( await User.findOneAndUpdate({ email }, { token }) ) {      // TODO: has token here
                postman.sendATokenLetter(name, email, token, tokenLink)
                return res.status(200).redirect('/user/home?status=info&e=verTokenSent')
            }
            return res.status(400).redirect('/user/home?status=issue&e=wrongCurrentPassw')
        } catch(e) { return res.status(500).send("Server error, try later please...") }
    }
    res.status(400).redirect('/user/home?status=issue&e=wrongCurrentPassw')
})


userRouter.post('/token/:token', async (req, res) => {
    
    const { email, token } = req.body
    
    if (email && token) {
        try {
            if ( await User.findOneAndUpdate({ email, token }, { token: 'verified' }) ) {      // successfuly VERIFIED email!
                
                return res.status(200).send('Your email was successfuly verified. Now you can close this page and get back to your profile')
            }
            return res.status(400).send('Wrong credentials have been sent. Try again please')
        } catch(e) { return res.status(500).send("Server error, try later please...") }
    }
    res.status(500).send("Sorry, email verification was unsuccessful. Try again later")
})




module.exports = userRouter