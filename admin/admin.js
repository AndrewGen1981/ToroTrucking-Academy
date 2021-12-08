const express = require('express')
const session = require('express-session')
const path = require('path')

// CONFIG
const admin = require('./config')
const adminTools = require('./adminTools')

// MODELS for mongoose
const { User } = require('../users/userModel')
const { dataCollectionForm } = require('../users/applicants/form1Model')
const { applicationForm } = require('../users/applicants/form2Model')
const { agreementForm } = require('../users/applicants/form3Model')


// PDF
const pdf = require('../static/pdf/pdf')


// @SESSION config
const ADM_SESS_DURATION = 1000 * 60 * 60 * 3    //  3 hours

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
        .populate('student')        // <- is this slows a process

        if (user === null) { return res.status(400).send(`Wrong request: ${id}`) }

        // Preparing updaters fields - original from db have onli admin's id, I' like to pass a name instead
        const forms = ['dataCollection', 'application', 'agreement']
        forms.map(form => {
            if (user[form]) {
                if (user[form].updatedAdmin) {
                    let updater = admin.findAdminById(user[form].updatedAdmin)
                    if (updater) { user[form].updatedAdmin = updater.name }      //  getting an admin's name by id
                }
            }
        })

        // getting info about signer on School's behalf
        const signer = getDocsSigner(user.agreement)
        // getting pdf object for DPF printing
        const pdfObj = user.dataCollection ? JSON.stringify(pdf.form1ToPDF(user.dataCollection)) : {}
        
        res.render(path.join(__dirname+'/views/userInfo.ejs'), { user, pdfObj, signer })

    } catch(e) {
        res.status(500).send(`Something is happened... ${e.message}. Try later please.`)
    }

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




// @FORMS UPDATING

// middleware for updating
async function checkAndUpdate(req, res, next) {
    const id = req.params.id    //  _id of updated Model
    const url = req.url     // url contains form's reference, used to undestand what form is being updated
    const { whatWasUpdated } = req.body     // string with updated Model fields - userInfo.ejs defines what fields to update

    if (whatWasUpdated && id && url) {

        const form = url.replace(`/${id}`, '').replace('/', '')     // substructing form type from url
        
        const Model = form === 'update-form1' ? dataCollectionForm
        : form === 'update-form2' ? applicationForm
        : form === 'update-form3' ? agreementForm
        : undefined

        if (Model) {    // if we found a Model, then update it with given fields
            try {
                let updatedRecord = {}
                whatWasUpdated.split(',').map(fieldName => {
                    updatedRecord[fieldName] = Array.isArray(req.body[fieldName]) ? req.body[fieldName].toString() : req.body[fieldName]
                })
                updatedRecord.updatedAdmin = req.session.userId
                updatedRecord.updatedDate = new Date()

                await Model.findByIdAndUpdate(id, updatedRecord)

                next()  // updatet successfully
            } catch(e) {
                res.send(`Oops... We almost did it! Issue: ${e.message}`)
            }
        } else {
            res.send(`Issue: cannot define Model to update... URL='${url}'. Form '${form}'`)
        }
    } else {
        res.send("Issue: nothing to update. Check fields you've updated... ")
    }
}


admRouter.post('/update-form1/:id', redirectToLogin, checkAndUpdate, async(req, res) => {
    const { postedPath } = req.body
    res.status(200).redirect(postedPath)    // redirecting back to the posting page
})

admRouter.post('/update-form2/:id', redirectToLogin, checkAndUpdate, async(req, res) => {
    const { postedPath } = req.body
    res.status(200).redirect(postedPath)    // redirecting back to the posting page
})

admRouter.post('/update-form3/:id', redirectToLogin, checkAndUpdate, async(req, res) => {
    const { postedPath } = req.body
    res.status(200).redirect(postedPath)    // redirecting back to the posting page
})




// @SIGNING of the agreement

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

        const { postedPath } = req.body
        return res.status(200).redirect(postedPath)    // redirecting back to the posting page

    } catch(e) {
        res.status(500).send(`Signing issue... ${e.message}. Try later please.`)
    }
})



// @QR-codes work - NOT in specific module, becauses uses same session identification for assignWithAdminsMachine option
// * main principle is - to enable qr work admin has to login first, this defines location as well
// * this is why /qr/:id route requires admins auth first of all

// qr configuration options
const qrCONFIG = {
    // can be in .env or specific json file if needed, so assecc can be provided from admin
    // specifies different modes of QR work
    assignWithAdminsMachine: true,
    requiresGeoLocationCheck: true,
    checkFullPartTimeStudents: true
}

// route /admin/qr/:id
admRouter.get('/qr/:id', redirectToLogin, (req, res) => {
    console.log(req.session.userId)
    const studentId = req.params.id    // receiving user _id from posting form
    res.send(studentId)
})



// @ admin/Student routes
admRouter.use('/student', redirectToLogin, require('../users/students/studentRouter'))


module.exports = admRouter