const express = require('express')
const session = require('express-session')
const path = require('path')

// CONFIG
const admin = require('./config')
const adminTools = require('./adminTools')

// MODELS for mongoose
const { User, Student, tools } = require('../users/userModel')
const { dataCollectionForm } = require('../users/applicants/form1Model')
const { applicationForm } = require('../users/applicants/form2Model')
const { agreementForm } = require('../users/applicants/form3Model')
const { qrCONFIG } = require('./config-qr')
const { Tuition } = require('../users/tuition/tuitionModel')


// PDF
const pdf = require('../static/pdf/pdf')
const { redirect } = require('express/lib/response')


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
admRouter.get('/', redirectToHome, (req, res) => {
    res.render(path.join(__dirname+'/admWelcome.ejs'), {
        id: req.session.userId,
        issue: admin.ISSUES[req.query.logIssue]
    })
})

admRouter.get('/profile', redirectToLogin, async(req, res) => {

    // analytics has to be done here (12 last month) - 13 poriods for analythics
    const date = new Date()
    const currentYear = date.getFullYear()
    const aYearBefore = currentYear - 1
    const month = date.getMonth()
    const startDate = new Date(`${aYearBefore}-${month + 1}-01`)

    const students = await Student.where("created").gt(startDate).select("created")

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const months = date.getMonth() - startDate.getMonth() + (date.getFullYear() - startDate.getFullYear()) * 12
    let analyticsArray = {}

    for (let i=0; i <= months; i++){
        
        let n = (month + i + 1) > monthNames.length ? (month + i) % monthNames.length : (month + i)
        let year = (month + i + 1) > monthNames.length ? currentYear : aYearBefore

        analyticsArray[`${year}-${n}`] = {
            month: monthNames[n],
            year,
            newStudents: 0
        }
    }
    for (let i=0; i < students.length; i++) {
        
        let created = new Date(students[i].created)
        let createdMonth = created.getMonth()
        let createdYear = created.getFullYear()

        analyticsArray[`${createdYear}-${createdMonth}`].newStudents += 1
    }

    res.render(path.join(__dirname+'/admProfile.ejs'), {
        user: res.locals.user,
        analyticsArray
    })
})




function checkCredentials(id, password) {
    // checks credentials, can be used for verification in other functions except Login
    if (!id || !password) { return false }
    
    const user = admin.findAdminById(id)

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

    // check Admin's Auth
    const adminId = req.session.userId
    if (!admin.checkAdminsAuth(adminId, 'read')) {
        return res.send('Not enough authorities for requested operation')
    }

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

    // check Admin's Auth
    const adminId = req.session.userId
    if (!admin.checkAdminsAuth(adminId, 'read')) {
        return res.send('Not enough authorities for requested operation')
    }

    // Auth is good, get user ID
    const id = req.params.id    //  user id
    const tab = req.query.activatetab       // what tab to show at start

    try {
        const user = await User.findById(id)
        .populate('dataCollection')
        .populate('application')
        .populate('agreement')
        .populate({
            path: 'student', 
            populate: { path: 'tuition', select: ["created", "isAllowed", "avLessonsRate", "lessons"] }
        })        // <- is this slows a process

        if (user === null) { return res.status(400).send(`Wrong request: ${id}`) }

        // Preparing updaters fields - original from db have only admin's id, I' like to pass a name instead
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
        
        // if user is a student and has clocks array already, then get student clocks's array - check tools to find out what is that
        if (user.agreement && user.student) {       // only when Agreement is signed and full/part is determined AND user is a Student
            if (user.agreement.visiting && user.student.clocks) {
                
                // just an Agreement perspective about full or part-time. And tools.reCalculateTTT will determine if it counts at all
                const minVisitingRequirements = user.agreement.visiting.toLowerCase().includes("full time") ? 6 : 4
                const { TTT, studentClocks } = tools.reCalculateTTT(user.student.clocks, minVisitingRequirements)       //  destructuring results

                return res.render(path.join(__dirname+'/views/userInfo.ejs'), { user, pdfObj, signer,
                    verTTT: TTT / (1000 * 60 *60),
                    verClocks: studentClocks,
                    tab
                })
                            
            }   //  type is determined AND clocks are present
        }   //  Agreement is signed AND user is a Student
        
        res.render(path.join(__dirname+'/views/userInfo.ejs'), { user, pdfObj, signer, tab })

    } catch(e) {
        res.status(500).send(`Something is happened... ${e.message}. Try later please.`)
    }

})



// without this BODY is empty when just fetching from client-side
admRouter.use(express.json({
    type: ['application/json', 'text/plain']
}))

// for user data updating (block/unblock/archive/delete)
admRouter.put('/user', redirectToLogin, async(req, res) => {

    // check Admin's Auth
    const adminId = req.session.userId
    if (!admin.checkAdminsAuth(adminId, 'write')) {
        return res.status(400).send('Not enough authorities for requested operation')
    }

    const { studentId, userId, action } = req.body
    if (!action) { return res.status(400).send('Action is not defined') }
    if (!userId) { return res.status(404).send('User is not defined') }
    // studentId CAN be undefined, when deleting a user

    if (action === "block" || action === "unblock") {
        try {
            if (!studentId) { return res.status(400).send('Not A Student') }

            const student = await Student.findById(studentId)
            if (!student) { return res.status(404).send('Student is not defined') }
            
            student.status = action
            await student.save()
            return res.status(200).end()
        } catch(e) {
            return res.status(500).send(`Issue: ${e.message}`)
        }
    }

    // action === archive TODO: should it transfer all archived data to other collection? or just filter data when showing student list

    if (action === "delete") {
        const user = await User.findById(userId)
        if (!user) { return res.status(404).send('User is not defined') }

        try {
            // deliting student info
            if (user.student) {
                const student = await Student.findById(user.student)
                if (student) {
                    if (student.tuition) { await Tuition.findByIdAndDelete(student.tuition) }   // deliting Tuition info
                    await student.remove()
                }
            }

            // deleting forms data
            if (user.agreement) {
                await agreementForm.findByIdAndDelete(user.agreement)
            }
            if (user.application) {
                await applicationForm.findByIdAndDelete(user.application)
            }
            if (user.dataCollection) {
                await dataCollectionForm.findByIdAndDelete(user.dataCollection)
            }

            // TODO: delete Instructors data, Graduation data and etc. here too !!!

            // deleting a user
            await user.remove()

            return res.status(200).end()
        } catch(e) {
            return res.status(500).send(`Issue: ${e.message}`)
        }
    }

    // action was not found
    res.status(400).end()
})



// Generating a view to print (NOT a PDF one)
admRouter.get('/print-form/:id', redirectToLogin, async(req, res) => {

    // check Admin's Auth
    const adminId = req.session.userId
    if (!admin.checkAdminsAuth(adminId, 'read')) {
        return res.send('Not enough authorities for requested operation')
    }
    
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
    // check Admin's Auth
    const adminId = req.session.userId
    if (!admin.checkAdminsAuth(adminId, 'write')) {
        return res.send('Not enough authorities for a form updating')
    }
    // auth is good
    const { postedPath } = req.body
    res.status(200).redirect(postedPath)    // redirecting back to the posting page
})

admRouter.post('/update-form2/:id', redirectToLogin, checkAndUpdate, async(req, res) => {
    // check Admin's Auth
    const adminId = req.session.userId
    if (!admin.checkAdminsAuth(adminId, 'write')) {
        return res.send('Not enough authorities for a form updating')
    }
    // auth is good
    const { postedPath } = req.body
    res.status(200).redirect(postedPath)    // redirecting back to the posting page
})

admRouter.post('/update-form3/:id', redirectToLogin, checkAndUpdate, async(req, res) => {
    // check Admin's Auth
    const adminId = req.session.userId
    if (!admin.checkAdminsAuth(adminId, 'write')) {
        return res.send('Not enough authorities for a form updating')
    }
    // auth is good
    const { postedPath } = req.body
    res.status(200).redirect(postedPath)    // redirecting back to the posting page
})




// @SIGNING of the agreement

admRouter.post('/sign/:id', redirectToLogin, async(req, res) => {
    // signs Agreement with Admin's credentials passed from client side

    // check Admin's Auth
    const adminId = req.session.userId
    if (!admin.checkAdminsAuth(adminId, 'write')) {
        return res.send('Not enough authorities to sign an Agreement')
    }

    // auth is good
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

// Middleware due to qrCONFIG.assignWithAdminsMachine
function qrRedirectToLogin (req, res, next) {
    // if user is NOT logged in, then redirect user to Login page if qrCONFIG.assignWithAdminsMachine
    if (!qrCONFIG.assignWithAdminsMachine) { return next() }

    if (!req.session.userId) {
        res.redirect('/admin')
    } else { next() }
}


// route /admin/qr/:id
admRouter.get('/qr/:id', qrRedirectToLogin, async (req, res) => {

    // check Admin's Auth
    const adminId = req.session.userId
    if (!admin.checkAdminsAuth(adminId, 'read')) {
        return res.send('Not enough authorities  for requested operation')
    }

    // auth is good
    const studentId = req.params.id    // receiving user _id from posting form
    let location    // this will be passed as 'location' to a clock

    if (qrCONFIG.assignWithAdminsMachine) {     // allowed from admin's machine only?
        if (req.session.userId) {     // let's check machine, if admin authorized
            const adminId = req.session.userId
            const currentAdmin = admin.findAdminById(adminId)
            location = currentAdmin.location
        } else {    // this is not an admin
            return res.status(400).send("Issue: Unrecognized admin. Login and try again.")
        }
    } else {    // or allowed from any machine?
        location = 'TURNED OFF'
    }
    
    try {
        //  getting today's date-prefix
        const diffDays = tools.getDatePrefix(new Date())
        
        const student = await Student.findById(studentId)
        if (!student) { return res.status(400).send(`Issue: Cannot find a Student with id ${studentId}`) }

        // can be in status of: block, unblock, archive, delete
        // only 'unblock' is good for Clocking
        if (student.status != "unblock") { return res.status(200).send(`Forbidden: Student status is ${student.status}`) }

        // check min time after last clock - 5 min to avoid doubling
        // counting todays clocks
        let todaysClocks = []
        student.clocks.map(clock => {
            if (clock.key == diffDays) {
                todaysClocks.push(clock)
            }
        })

        if (todaysClocks.length !== 0) {    // if this is NOT a 1st clock for today, then go further, if not - check 5 mins and full/part option
            const time1 = new Date(todaysClocks[todaysClocks.length-1].date)
            const time2 = new Date()
            const hours_between_clocks = Math.abs(time2 - time1) / (3600000)

            // check if less, than 5 mins - DOUBLING
            if (hours_between_clocks < 0.08333) {   // double clock, less than 5 mins
                return res.status(200).send("Less than 5 mins from last one. Ignored")
            }
            
            let minTime = 0     // there are no restrictions when to Clock OUT

            // checking if passed 4/6 hours if qrCONFIG.checkFullPartTimeStudents && this is Clock OUT
            if (qrCONFIG.checkFullPartTimeStudents && ((todaysClocks.length % 2) !== 0)) { 
                const user = await User.findById(student.user).populate('agreement')
                minTime = user.agreement.visiting.toLowerCase().includes("full time") ? 6 : 4
                
                if (hours_between_clocks < minTime*0.97) {    //    duration is LESS, than minimum required time * 0.97(ratio to skip last minutes)
                    const h = Math.trunc(hours_between_clocks)
                    const m = Math.round((hours_between_clocks - h) * 60)
                    const mt = m === 1 ? `0${m} minute` : m < 10 ? `0${m} minutes` : `${m} minutes`
                    const ht = h > 0 ? `only ${h} hour(s) and ${mt}` : `less than hour - ${mt} only`
                    
                    let minTimeMsg = `According to the Agreement, this student minimum attendance at classes must be at least ${minTime} hours.`
                    minTimeMsg += ` ${user.agreement.visiting.toUpperCase()}. `
                    minTimeMsg += `Student is trying to make a clock OUT on the passage ${ht}. ClockOUT is NOT added, try later please.`

                    return res.status(200).send(minTimeMsg)
                }
            }
        }

        if(qrCONFIG.requiresGeoLocationCheck) {
            // GEO required, if forbiden by client, then 'na' will return to /admin/geo-update
            student.clocks.push({ date: new Date(), key: diffDays, lat: 'na', lon: 'na', location })
        } else {
            // GEO NOT required, 'nr' will return to /admin/geo-update
            student.clocks.push({ date: new Date(), key: diffDays, lat: 'nr', lon: 'nr', location })
        }

        await student.save()

        const clockBacklink = student.clocks[student.clocks.length-1]._id

        return res.render(path.join(__dirname+'/views/qr.ejs'), { 
            student,
            qrCONFIG,
            key: diffDays,
            clockBacklink
        })

    } catch(e) {
        return res.status(400).send(`Issue occursed: ${e.message}`)
    }

})


// receives "callback" from page after /admin/qr/:id with geo data
admRouter.post('/qr-update-geo', async (req, res) => {
    const { studentId, clockBacklink, error, lat, lon } = req.body

    if (qrCONFIG.requiresGeoLocationCheck) {     //   if GEO required, then check result
        if (error != 'ok') { return res.status(400).send(`GEO location issue: ${error}`) }
    }
    if (error === 'ok') {   // can be 'not required' also
        try {
            const student = await Student.findById(studentId).populate([
                {
                    path: 'user', populate: { path: 'dataCollection' }
                },
                {
                    path: 'user', populate: { path: 'agreement' }
                }
            ])

            // just an Agreement perspective about full or part-time. And tools.reCalculateTTT will determine if it counts at all
            const minVisitingRequirements = student.user.agreement.visiting.toLowerCase().includes("full time") ? 6 : 4

            for(let i=0; i<student.clocks.length; i++) {    // updates lat and lon in a clock referred as 'clockBacklink'
                if(student.clocks[i]._id.toString() === clockBacklink) {
                    student.clocks[i].lat = lat
                    student.clocks[i].lon = lon
                    student.TTT = tools.reCalculateTTT(student.clocks, minVisitingRequirements).TTT / (1000 * 60 *60)
                    await student.save()
                    break
                }
            }

            return res.status(200).render(path.join(__dirname+'/views/qr_success-clock.ejs'), { 
                student,
                TODClocks: tools.getTodayClocksInfo(student.clocks)
            })

        } catch(e) {
            return res.status(400).send(`Issue occursed in UPDATE-GEO: ${e.message}`)
        }
        
    }    
})



// @CLOCKs work - showing and updating

// ROUTE POST /admin/clocks for updating clocks
admRouter.post('/clocks', redirectToLogin, async(req, res) => {
    // check Admin's Auth
    const adminId = req.session.userId
    if (!admin.checkAdminsAuth(adminId, 'write')) {
        return res.send('Not enough authorities for requested operation')
    }
    // Auth is good, get user ID
    const {studentId, studentKey, studentName, visiting} = req.body
    try {
        const student = await Student.findById(studentId).select(['email', 'TTT', 'clocks'])
        if (student) {

            // just an Agreement perspective about full or part-time. And tools.reCalculateTTT will determine if it counts at all
            const minVisitingRequirements = visiting.toLowerCase().includes("full time") ? 6 : 4
            const { TTT, studentClocks } = tools.reCalculateTTT(student.clocks, minVisitingRequirements)       //  destructuring results

            return res.render(path.join(__dirname+'/views/userInfoClocks.ejs'), { 
                studentId, studentKey, studentName, visiting,
                verTTT: TTT / (1000 * 60 *60),
                verClocks: studentClocks,
                admin: req.session.userId
            })
        }
        return res.status(404).send(`Student with ID#${studentId} not found`)
    } catch(e) {
        res.status(500).send(`Something is happened... ${e.message}. Try later please.`)
    }
})

// for clocks updating
admRouter.post('/clocks-update', redirectToLogin, async(req, res) => {
    const { studentId, clockDate, 
        clockIN, latIN, lonIN, locationIN, doneByAdminIN, updatedByAdminIN,
        clockOUT, latOUT, lonOUT, locationOUT, doneByAdminOUT, updatedByAdminOUT,
    } = req.body

    // tool, converting strings to date with time
    function settime(dateString, timeString) {
        if (timeString.length < 6) { timeString += ':00' }
        return new Date(`${dateString}T${timeString}-08:00`)
    }

    const newClocks = []
    let clIN, clOUT
    let TTT = 0

    clockDate.map((dateString, index) => {
        clIN = settime(dateString, clockIN[index])
        clOUT = settime(dateString, clockOUT[index])
        
        if ((clOUT - clIN) > 0) {    // skip empty
            TTT += clOUT - clIN
            // adding clockIN
            newClocks.push({
                date: new Date(clIN),
                key: tools.getDatePrefix(new Date(dateString)),
                lat: latIN[index],
                lon: lonIN[index],
                location: locationIN[index],
                doneByAdmin: doneByAdminIN[index],
                updatedByAdmin: updatedByAdminIN[index]
            })
            // adding clockOUT
            newClocks.push({
                date: new Date(clOUT),
                key: tools.getDatePrefix(new Date(dateString)),
                lat: latOUT[index],
                lon: lonOUT[index],
                location: locationOUT[index] != 'none' ? locationOUT[index] : locationIN[index],
                doneByAdmin: doneByAdminOUT[index],
                updatedByAdmin: updatedByAdminOUT[index]
            })
        }
    })

    try {
        const student = await Student.findById(studentId)
        if (student) {
            student.TTT = TTT / (1000 * 60 *60)
            student.clocks = newClocks
            await student.save()
            return res.status(200).redirect(`/admin/user/${student.user}?activatetab=4`)
        }
        res.send('student is not defined')
    } catch(e) {
        res.send(`Issue: ${e.message}`)
    }

    
})



// @ admin/Student routes
admRouter.use('/student', redirectToLogin, require('../users/students/studentRouter'))


module.exports = admRouter