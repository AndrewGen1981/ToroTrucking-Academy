// Handles all admin/students routes
// used in ADMIN.JS

const express = require('express')
const studentRouter = express.Router()
const path = require('path')

// CONFIG
const admin = require('../../admin/config')

// MODELS for mongoose
const { User, Student, StudentCONFIG, tools } = require('../userModel')
const { Tuition } = require('../tuition/tuitionModel')

// do I need this here?
// const { dataCollectionForm } = require('../applicants/form1Model')
// const { applicationForm } = require('../applicants/form2Model')
// const { agreementForm } = require('../applicants/form3Model')


// @Middleware
function ifCanRead (req, res, next) {
    // check Admin's Auth - if can READ
    const adminId = req.session.userId
    if (!admin.checkAdminsAuth(adminId, 'read')) {
        return res.render(path.join(global.__basedir + "/static/general-pages/NEA/NEA.ejs"), { auth: "read" })
    } else { next() }
}
function ifCanWrite (req, res, next) {
    // check Admin's Auth - if can WRITE
    const adminId = req.session.userId
    if (!admin.checkAdminsAuth(adminId, 'write')) {
        return res.render(path.join(global.__basedir + "/static/general-pages/NEA/NEA.ejs"), { auth: "write" })
    } else { next() }
}
function ifCanReadOrInstructor (req, res, next) {
    // check Admin's Auth - if INSTRUCTOR
    const adminId = req.session.userId

    if (admin.checkAdminsAuth(adminId, 'read')) { return next() }
    if (admin.checkAdminsAuth(adminId, 'instructor')) { return next() }

    return res.render(path.join(global.__basedir + "/static/general-pages/NEA/NEA.ejs"), { auth: "read or instructor" })
}


// @Students ROUTES

// INs route is a root one
studentRouter.get('/', ifCanReadOrInstructor, async (req, res) => {
    // auth is good
    const studentPopulated = ['key', 'TTT', 'clocks']
    const userPopulated = ['dataCollection']
    const dataCollPopulated = [ 'firstName', 'lastName', 'middleName' ]

    const students = await Student.find({ status: 'unblock' }).select(studentPopulated).populate([
        {
            path: 'user', select: userPopulated,
            populate: { path: 'dataCollection', select: dataCollPopulated }
        }
    ])

    let inStudents = []
    const today = tools.getDatePrefix(new Date()).toString()

    students.map(student => {
        let todayClocks = student.clocks.filter(clock => { return clock.key == today })
        if (todayClocks.length) {
            student.clocks = todayClocks
            inStudents.push(student)
        }
    })


    res.render(path.join(__dirname+'/INs.ejs'), { inStudents })
})



// @GET admin/student/list
studentRouter.get('/list', ifCanRead, async(req, res) => {
    // auth is good
    const studentPopulated = ['key', 'email', 'TTT', 'created', 'status', 'location']
    const userPopulated = ['token']

    const dataCollPopulated = [
        'firstName', 'lastName', 'middleName', 'street', 'city', 'state', 'zip', 'phone', 'DOB', 'SSN'
    ]

    const agrPopulated = [
        'program', 'class', 'transmission', 'visiting', 'tuitionCost', 'regisrFee', 'supplyFee', 'otherFee', 
        'payment', 'thirdPartyList', 'schoolSignDate', 'schoolSignRep', 'updatedAdmin', 'updatedDate'
    ]

    const tuitionPopulated = ['isAllowed', 'avLessonsRate']

    // filter to find Students due to LOCATION: All - can see All, else - only assigned to location + UNSET
    const adminProfile = admin.findAdminById(req.session.userId)
    let filter = adminProfile.location === admin.LOCATION.All ? {} : { location: [adminProfile.location, admin.LOCATION.Unset] }

    const students = await Student.find(filter).select(studentPopulated).populate([
        {
            path: 'user', select: userPopulated,
            populate: { path: 'dataCollection', select: dataCollPopulated }
        },
        {
            path: 'user', select: userPopulated, 
            populate: { path: 'agreement', select: agrPopulated }
        },
        {
            path: 'tuition', select: tuitionPopulated
        }
    ])

    res.render(path.join(__dirname+'/student-list.ejs'), { students, adminProfile })
})


// @POST admin/student/new/id
studentRouter.post('/new/:id', ifCanWrite, async(req, res) => {
    // auth is good
    const userId = req.params.id    // receiving user _id from posting form
    
    try {
        const user = await User.findById(userId)    // finds a user with given _id
        if (!user) { return res.status(404).send(`Cannot find user with id: ${userId}`) }

        // Only 1 student can be assigned to 1 user, let's check maybe there is already Student with given user._id
        const existingStudent = await Student.findOne({ user: userId })
        if (existingStudent) { return res.status(500).send(`This user is a student alredy, key is ${existingStudent.key}`) }

        // working with Student-List cofigurations - receiving 
        const studentConfigurations = await StudentCONFIG.findOne({ configType: 'student-list' })
        const lastStudentKey = studentConfigurations.lastStudentKey + 1
        await StudentCONFIG.updateOne({ configType: 'student-list' }, { lastStudentKey })

        // creating a new Student
        const student = await new Student({
            key: lastStudentKey,
            email: user.email,
            user: userId
        }).save()
        
        // saving backlink in a User model on new Student
        user.student = student._id
        await user.save()

        // creating new Tuition record for this Student
        const tuition = await new Tuition({
            key: lastStudentKey,
            email: user.email,
            student_id_string: student._id
        }).save()
        // saving ref in Student for its lessons
        student.tuition = tuition._id
        await student.save()

    } catch(e) {
        return res.status(500).send(`Issue when saving a new sudent: ${e.message}`)
    }

    res.status(200).redirect('/admin/user-area')     // ok, redirecting to users area
})



// Updates Location
studentRouter.post('/update-location', ifCanWrite, async(req, res) => {
    const {userId, studentId, location} = req.body
    if (!userId || !studentId || !location) {
        return res.status(404).send(`Location updating isssue: ${userId}, ${studentId}, ${location}`)
    }
    try {
        const student = await Student.findById(studentId)
        if (!student) {
            return res.status(404).send(`Cannot find student with ID: ${studentId}`)
        }
        if (student.location != location) {
            student.location = location
            await student.save()
        }
        res.redirect(`/admin/user/${userId}?activatetab=4`)
    } catch(e) {
        return res.status(500).send(`Location updating isssue: ${e.message}`)
    }
})


// Updates Learning Center Access
studentRouter.get("/allow-tuition/:id", ifCanWrite, async(req, res) => {    // Allows tuition for an existing Student
    // auth is good
    const studentId = req.params.id    // receiving student _id from client-side
    const student = await Student.findById(studentId).select(["key", "email", "user", "tuition"])

    if (studentId && student) {
        try {
            let tuition = await Tuition.findOne({ student_id_string: studentId })
            // doing the next NOT depending if student has a tuition record already or not. Because records can be not mutually referred
            // double check if there is not tuition record for this student
            if (tuition) {     //  if there is a tuition record for this student
                student.tuition = tuition._id
            } else {    //  if there is NO tuition record for this student
                // creating new Tuition record for this Student
                tuition = await new Tuition({
                    key: student.key,
                    email: student.email,
                    student_id_string: student._id
                }).save()
                // saving ref in Student for its lessons
                student.tuition = tuition._id
            }
            await student.save()
            return res.status(200).redirect(`/admin/user/${student.user}`)
        } catch(e) {
            return res.status(500).send(`Server issue: ${e.message}`)
        }
    }
    return res.status(400).send(`Cannot find Student with id: ${studentId}`)
})


studentRouter.get("/change-tuition-access/:id", ifCanWrite, async(req, res) => { // Forbids tuition for an existing Student
    // auth is good
    const studentId = req.params.id    // receiving student _id from client-side
    const action = req.query.action
    const student = await Student.findById(studentId).select(["user", "tuition"])
    
    if (student) {
        if (student.tuition) {
            const tuition = await Tuition.findById(student.tuition).select("isAllowed")
            if (tuition) {
                if (action === 'enable') { tuition.isAllowed = true }
                if (action === 'disable') { tuition.isAllowed = false }
                if (action === 'enable' || action === 'disable') {
                    try {
                        await tuition.save()
                        return res.status(200).redirect(`/admin/user/${student.user}`)
                    } catch(e) {
                        return res.status(500).send(`Cannot save tuition record: ${e.message}`)
                    }
                }
            }
            return res.status(404).end()
        }
    }
    return res.status(400).send(`Cannot find Student with id: ${studentId}`)
})


// @POST admin/student/print-bulk-qr
studentRouter.post('/print-bulk-qr', (req, res) => {
    // BULK QRs printing
    let { qrsToPrint, qrsNamesToPrint, qrsKeysToPrint, qrsClassesToPrint } = req.body

    if(!Array.isArray(qrsToPrint)) { 
        qrsToPrint = [qrsToPrint]
        qrsNamesToPrint = [qrsNamesToPrint]
        qrsKeysToPrint = [qrsKeysToPrint]
        qrsClassesToPrint = [qrsClassesToPrint]
    }

    res.render(path.join(__dirname+'/qr_bulk-print.ejs'), { qrsToPrint, qrsNamesToPrint, qrsKeysToPrint, qrsClassesToPrint })
})



// @POST admin/student/print-bulk-qr
studentRouter.get('/timetest', (req, res) => {

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


module.exports = studentRouter