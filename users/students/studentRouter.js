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
        res.send('Not enough authorities for reviewing page content')
    } else { next() }
}
function ifCanWrite (req, res, next) {
    // check Admin's Auth - if can READ
    const adminId = req.session.userId
    if (!admin.checkAdminsAuth(adminId, 'write')) {
        res.send('Not enough authorities for changing data')
    } else { next() }
}


// @Students ROUTES

// INs route is a root one
studentRouter.get('/', ifCanRead, async (req, res) => {
    // auth is good
    const studentPopulated = ['key', 'TTT', 'clocks']
    const userPopulated = ['dataCollection']
    const dataCollPopulated = [ 'firstName', 'lastName', 'middleName' ]

    const students = await Student.find({}).select(studentPopulated).populate([
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


// filter to find Students with
let filter = {}
// @GET admin/student/list
studentRouter.get('/list', ifCanRead, async(req, res) => {
    // auth is good
    const studentPopulated = ['key', 'email', 'TTT', 'created', 'status']
    const userPopulated = ['token']

    const dataCollPopulated = [
        'firstName', 'lastName', 'middleName', 'street', 'city', 'state', 'zip', 'phone', 'DOB', 'SSN'
    ]

    const agrPopulated = [
        'program', 'class', 'transmission', 'visiting', 'tuitionCost', 'regisrFee', 'supplyFee', 'otherFee', 
        'payment', 'thirdPartyList', 'schoolSignDate', 'schoolSignRep', 'updatedAdmin', 'updatedDate'
    ]

    const tuitionPopulated = ['isAllowed', 'avLessonsRate']


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

    res.render(path.join(__dirname+'/student-list.ejs'), { students })
})


// @POST admin/student/new/id
studentRouter.post('/new/:id', ifCanWrite, async(req, res) => {
    // auth is good
    const userId = req.params.id    // receiving user _id from posting form
    
    try {
        const user = await User.findById(userId)    // finds a user with given _id

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


module.exports = studentRouter