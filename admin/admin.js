const express = require('express')
const session = require('express-session')
const path = require('path')

// CONFIG
const admin = require('./config')
const adminTools = require('./adminTools')

// MODELS for mongoose
const { User } = require('../users/userModel')
const { dataCollectionForm, getForm1Object } = require('../users/applicants/form1Model')
const { applicationForm, getForm2Object } = require('../users/applicants/form2Model')
const { agreementForm, getForm3Object } = require('../users/applicants/form3Model')
const { Student, StudentCONFIG } = require('../users/students/studentModel')

// PDF
const pdf = require('../static/pdf/pdf')


// @SESSION config
const ADM_SESS_DURATION = 1000 * 60 * 60    //  60 minutes

// extracting from process.env
const {
    NODE_ENV = 'development',

    SESS_NAME = 'ADMSID',
    SESS_SECRET = '!GODMODE_FORADMINS',
    SESS_LIFETIME = ADM_SESS_DURATION
} = process.env

const IN_PROD = NODE_ENV === 'production'

// ./admin
const admRouter = express.Router()

// adding session configuration
admRouter.use(session({
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


// ADMIN obj contains info about logged admin. Used for edit and signing procedures
let currentAdmin = {
    id: undefined,
    name: undefined,
    first: undefined,
    last: undefined,
    title: undefined
}

function extractAdminFields(adminProfile) {
    return {
        id: adminProfile.id,
        name: adminProfile.name,
        first: adminProfile.name.split(' ')[0],
        last: adminProfile.name.split(' ')[1],
        title: adminProfile.title
    }
}

function updateAdminInfoIfNeeded(adminProfile) {
    if (!adminProfile) { return false }
    if (!adminProfile.id) { return false }
    if (!adminProfile.name) { return false }
    if (adminProfile.name === currentAdmin.name) { return false }      // we have this admin already

    currentAdmin = extractAdminFields(adminProfile)
}



// @MIDDLEWARE
function redirectToLogin (req, res, next) {
    // if user is NOT logged in, then redirect user to Login page
    if (!req.session.userId) {
        res.redirect('/admin')
    } else { next() }
}
function redirectToHome (req, res, next) {
    // if user is logged in, then redirect user to Home page
    if (req.session.userId) {
        res.redirect('/admin/profile')
    } else { next() }
}
admRouter.use((req, res, next) => {   // !!! general middleware - will be used before EACH ROUTE!!!
    if (req.session.userId) {   // if there is one, then tries to find it in users array and inject it to LOCALS - spec.obj. for sharing data between functions
        
        // const profile = admin.  PROFILES. find(admin => admin.id.toUpperCase() === req.session.userId.toUpperCase())
        const profile = admin.findAdminById(req.session.userId)

        res.locals.user = profile
        updateAdminInfoIfNeeded(profile)
    }
    next()
})




// LOGIN, MAIN, PROFILE ROUTES
admRouter.get('/', (req, res) => {
    res.render(path.join(__dirname+'/admWelcome.ejs'), {
        id: req.session.userId,
        issue: admin.ISSUES[req.query.logIssue]
    })
})

admRouter.get('/profile', redirectToLogin, (req, res) => {
    res.render(path.join(__dirname+'/admProfile.ejs'), user = res.locals.user)
})




function checkCredentials(id, password) {
    // checks redentials, can be used for verification in other functions except Login
    if (!id || !password) { return false }
    
    const user = admin.findAdminById(id)
    // .PROFILES.find(admin => admin.id.toUpperCase() === id.toUpperCase())

    if (!user) { return false } // can not find a user
    if (user.password != password) { return false } // wrong password
        
    return true
}

admRouter.post('/login', redirectToHome, (req, res) => {
    const { id, password } = req.body
    if (checkCredentials(id, password)) {
        req.session.userId = id
        return res.redirect('/admin/profile')
    } else {
        res.status(400).redirect('/admin?logIssue=wrongIDPASS')
    }
})

admRouter.post('/logout', redirectToLogin, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/admin/profile')
        }
    })
    res.clearCookie(SESS_NAME)
    res.redirect('/admin')
})


// @USERS AREA Routes
admRouter.get('/user-area', redirectToLogin, async (req, res) => {
    res.render(path.join(__dirname + '/views/__userArea.ejs'), { HTML:  await adminTools.getUsers({}, 100, 0) })
})




// @USERS/APPLICANTS/STUDENTS profiles form admin

function getDocsSigner(agreement) {
    // getting info about signer on School's behalf
    // signer should be recorded in applicant data, let's check
    if (!agreement) { return currentAdmin } // no current user will sign
    if (!agreement.schoolSignRep) { return currentAdmin } // no current user will sign
    
    const adm = admin.findAdminById(agreement.schoolSignRep)
    if (!adm) { return currentAdmin } // wrong admin id passed

    return extractAdminFields(adm)
}


admRouter.get('/user/:id', redirectToLogin, async(req, res) => {

    const id = req.params.id

    try {
        const user = await User.findById(id)
        .populate('dataCollection')
        .populate('application')
        .populate('agreement')

        if (user === null) { return res.status(400).send(`Wrong request: ${id}`) }

        // getting info about signer on School's behalf
        const signer = getDocsSigner(user.agreement)
        // getting pdf object for DPF printing
        const pdfObj = user.dataCollection ? JSON.stringify(pdf.form1ToPDF(user.dataCollection)) : {}
        
        res.render(path.join(__dirname+'/views/userInfo.ejs'), { user, pdfObj, signer })

    } catch(e) {
        res.status(500).send(`Something is happened... ${e.message}. Try later please.`)
    }





    // @next cpde is for converting APPLICANT to a STUDENT

    // working with Student-List cofigurations
    // try {
    //     const studentConfigurations = await StudentCONFIG.findOne({ configType: 'student-list' })
    //     const lastStudentKey = studentConfigurations.lastStudentKey + 1
    //     await StudentCONFIG.updateOne({ configType: 'student-list' }, { lastStudentKey })
        

    //     // if (await Student.findOneAndUpdate({ email }, { user: newUser._id }) === null) {      // #3 Updating/Saving reference to an Applicant model
    //     //     new Student({ email, user: newUser._id }).save()
    //     // }

    //     Student({
    //         key: lastStudentKey,
    //         email: "test@gmail.com",
    //         user: req.params.id
    //     }).save().then(async(newStudent) => {
    //         User.findOneAndUpdate({ email: req.session.userId }, { key: lastStudentKey })      // saving backlink User -> Student
    //     })

    // } catch(e) {
    //     return res.send(`Student List configuration issue: ${e.message}`)
    // }

    // res.send('done')
})



// Generating a view to print (NOT a PDF one)
admRouter.get('/print-form/:id', redirectToLogin, async(req, res) => {
    
    const id = req.params.id
    const form = req.query.form
    if (!id || !form) { return res.status(400).send(`Wrong request: ${id} : ${form}`) }

    try {

        const user = await User.findById(id)
        .populate('dataCollection')
        .populate('application')
        .populate('agreement')

        if (user === null) { return res.status(400).send(`Wrong request: ${id}`) }

        // getting info about signer on School's behalf
        const signer = getDocsSigner(user.agreement)

        if (form === 'form1') {
            return res.render(path.join(__dirname+'/views/_view-form1.ejs'), { user, signer })
        } else {
            if (form === 'form2') {
                return res.render(path.join(__dirname+'/views/_view-form2.ejs'), { user, signer })
            } else {
                if (form === 'form3') {
                    return res.render(path.join(__dirname+'/views/_view-form3.ejs'), { user, signer })
                } else {
                    return res.status(400).send(`Wrong request: ${form}`)
                }
            }
        }

    } catch(e) {
        res.status(500).send(`Something is happened... ${e.message}. Try later please.`)
    }
})


admRouter.post('/sign/:id', redirectToLogin, async(req, res) => {
    // signs Agreement with Admin's credentials passed from client side

    const agreementId = req.params.id

    if(!checkCredentials(req.session.userId, req.body.signerPassword)) { 
        return res.status(400).redirect('back')     // password not belongs to current logged admin
    }

    // credentials are correct
    try {
        const agreement = await agreementForm.findByIdAndUpdate(agreementId, {
            tuitionCost: req.body.tuitionCostItem,
            regisrFee: req.body.regisrFeeItem,
            supplyFee: req.body.supplyFeeItem,
            otherFee: req.body.otherFeeItem,
            schoolSignRep: req.session.userId,
            schoolSignDate: new Date()
        })

        if (agreement === null) { return res.status(400).send(`Wrong request: ${agreementId}`) }

        return res.status(200).redirect('/admin/user-area')   // all ok

    } catch(e) {
        res.status(500).send(`Signing issue... ${e.message}. Try later please.`)
    }
})


admRouter.post('/update-form1/:id', redirectToLogin, async(req, res) => {
    const obj = {
        firstName, lastName, middleName,
        street, city, state, zip,
        phone, DOB, SSN,
        race, hispanic, disabled, veteran, sex, grade
    } = req.body
    res.send(JSON.stringify(obj))
})

admRouter.post('/update-form2/:id', redirectToLogin, async(req, res) => {
    res.send('updating form2')
})

admRouter.post('/update-form3/:id', redirectToLogin, async(req, res) => {
    res.send(req.body.payment)
})



// @ admin/Student routes
admRouter.use('/students', redirectToLogin, require('../users/students/studentRouter'))


module.exports = admRouter