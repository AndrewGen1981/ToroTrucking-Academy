const express = require('express')
const path = require('path')

const instRouter = express.Router()

// import test objects
const { test1_preTrip_A_incab } = require('./test1_class_A_incab')
const { test1_preTrip_A_outcab } = require('./test1_class_A_outcab')
const { test1_preTrip_B_incab } = require('./test1_class_B_incab')
const { test1_preTrip_B_outcab } = require('./test1_class_B_outcab')

const { test2_backing } = require('./test2_backing')
const { test3_city } = require('./test3_city')

const { StudentScoring, InstructorScoring } = require('./scoringModel')


// CONFIG
const admin = require('../config')

// MODELS for mongoose
const { User, Student, tools } = require('../../users/userModel')

function ifInstructor (req, res, next) {
    // check Admin's Auth - if INSTRUCTOR
    const adminId = req.session.userId
    if (admin.checkAdminsAuth(adminId, 'instructor')) { return next() }
    return res.render(path.join(global.__basedir + "/static/general-pages/NEA/NEA.ejs"), { auth: "read or instructor" })
}


async function getStudentData(id) {
    // returns Student data for tests by ID
    const studentPopulated = ['key', 'TTT', 'status', 'location']
    const userPopulated = ['email']
    const dataAgrPopulated = ['class', 'transmission']
    const dataCollPopulated = ['firstName', 'lastName', 'middleName']

    return await Student.findById(id).select(studentPopulated).populate([
        {
            path: 'user', select: userPopulated,
            populate: { path: 'agreement', select: dataAgrPopulated },
        },
        {
            path: 'user', select: userPopulated,
            populate: { path: 'dataCollection', select: dataCollPopulated }
        }
    ])
}
// @IN-CAB
instRouter.post('/incab', ifInstructor, async (req, res) => {
    const { studentId } = req.body
    try {
        const student = await getStudentData(studentId)

        const agrClass = student.user.agreement.class
        if (agrClass === "CDL Class A" || agrClass === "Upgrade to Class A") {
            return res.render(path.join(__dirname + '/test1_view_pretrip.ejs'), {
                title: 'Class A preTrip Inspection IN-CAB scoring',
                examiner: admin.findAdminById(req.session.userId),
                test: test1_preTrip_A_incab,
                type: 'INCAB',
                student
            })
        }
        if (agrClass === "CDL Class B" || agrClass === "Endorsements") {
            return res.render(path.join(__dirname + '/test1_view_pretrip.ejs'), {
                title: 'Class B Passenger and School Bus IN-CAB scoring',
                examiner: admin.findAdminById(req.session.userId),
                test: test1_preTrip_B_incab,
                type: 'INCAB',
                student
            })
        }
        return res.status(404).send(`Scoring form was not found for class ${agrClass}`)
    } catch(e) {
        res.status(404).send(`Error: ${e.message}`)
    }
})
// OUT-CAB
instRouter.post('/outcab', ifInstructor, async (req, res) => {
    const { studentId } = req.body
    try {
        const student = await getStudentData(studentId)

        const agrClass = student.user.agreement.class
        if (agrClass === "CDL Class A" || agrClass === "Upgrade to Class A") {
            return res.render(path.join(__dirname + '/test1_view_pretrip.ejs'), {
                title: 'Class A preTrip Inspection OUT-CAB scoring',
                examiner: admin.findAdminById(req.session.userId),
                test: test1_preTrip_A_outcab,
                type: 'OUTCAB',
                student
            })
        }
        if (agrClass === "CDL Class B" || agrClass === "Endorsements") {
            return res.render(path.join(__dirname + '/test1_view_pretrip.ejs'), {
                title: 'Class B Passenger and School Bus OUT-CAB scoring',
                examiner: admin.findAdminById(req.session.userId),
                test: test1_preTrip_B_outcab,
                type: 'OUTCAB',     // INCAB, OUTCAB, BACKING, CITY
                student
            })
        }
        return res.status(404).send(`Scoring form was not found for class ${agrClass}`)
    } catch(e) {
        res.status(404).send(`Error: ${e.message}`)
    }
})
// BACKING (Straight, Offset, Alley Dock)
instRouter.post('/backing', ifInstructor, async (req, res) => {
    const { studentId } = req.body
    try {
        const student = await getStudentData(studentId)
        return res.render(path.join(__dirname + '/test2_view_backing.ejs'), {
            title: 'Backing Manuvers Scoring',
            examiner: admin.findAdminById(req.session.userId),
            test: test2_backing,
            type: 'BACKING',
            student
        })
    } catch(e) {
        res.status(404).send(`Error: ${e.message}`)
    }
})
// CITY
instRouter.post('/city', ifInstructor, async (req, res) => {
    const { studentId } = req.body
    try {
        const student = await getStudentData(studentId)
        return res.render(path.join(__dirname + '/test3_view_city.ejs'), {
            title: 'Drive Test Scoring',
            examiner: admin.findAdminById(req.session.userId),
            test: test3_city,
            type: 'CITY',
            student
        })
    } catch(e) {
        res.status(404).send(`Error: ${e.message}`)
    }
})


// SAVE the Scoring
instRouter.post('/scoring-save', ifInstructor, async (req, res) => {
    const { studentId, scoringType, scoringData, comments, certificate } = req.body

    try {
        const student = await Student.findById(studentId)
        if (!student) { return res.status(404).send(`Student with id#${studentId} is not found`) }

        const result = JSON.parse(scoringData)

        const studentScoringItem = {
            instructor: result.examinerName,
            result: result.ifPassed,
            details: scoringData,
            comment: comments,
            certificate: certificate == 'on',
        }
        const instructorScoringItem = {
            instructorId: result.examinerId,
            instructorName: result.examinerName,
            instructorLocation: result.examinerLocation,
            
            scoringType: scoringType,
            scoring_str_ref: 'NOREF',      // string _id studentScoringSchema.scoringTypeOf[i] to retrive data
            scoring_certificate: certificate == 'on',
            scoring_comment: comments,

            examinedStudent: result.studentName,
            examinedStudentKey: result.studentKey,
            examinedStudent_str_ref: studentId
        }

        // save StudentScoring - schema is used for quick info search typeof "scoring per a student" for student analytics
        let studentScoring

        // is it 1st scoring?
        if (!student.scoring) {
            studentScoring = await new StudentScoring({
                key: result.studentKey,
                email: result.studentEmail,
                student_id_string: studentId,
                lastDone: new Date(),
                lastDoneBy: result.examinerId,

                // INCAB, OUTCAB, BACKING, CITY
                scoringsInCab: scoringType === 'INCAB' ? [studentScoringItem] : [],
                scoringsOutCab: scoringType === 'OUTCAB' ? [studentScoringItem] : [],
                scoringsBacking: scoringType === 'BACKING' ? [studentScoringItem] : [],
                scoringsCity: scoringType === 'CITY' ? [studentScoringItem] : [],
            }).save()

            student.scoring = studentScoring
            await student.save()
        } else {
            studentScoring = await StudentScoring.findById(student.scoring)
            if (!studentScoring) { return res.status(404).send(`Cannot find scoring ${student.scoring} of student id#${studentId}`) }
            // react on isAllowed flag in schema
            if (studentScoring.isAllowed) {
                // stick with 10mins delay - the same scoring per same student by same instructor can be saved within 15min only
                const dt1 = new Date(studentScoring.lastDone)
                const dt2 = new Date()
                const diff = Math.abs(Math.round((dt2.getTime() - dt1.getTime()) / (60000)))
                
                if (diff < 10 && studentScoring.lastDoneBy == result.examinerId) {
                    studentScoring.isAllowed = false    // to skip scoring saving on Instructor's side - less than 10 mins
                    return res.status(400).send(`${diff} minutes ago another scoring was created for this student with your instructor's ID. Too good to be real, or someone else is using your account. This result will not be recorded, you have at least 10 minutes for one scoring.`)
                } else {
                    studentScoring.lastDone = new Date()
                    studentScoring.lastDoneBy = result.examinerId
                    switch (scoringType) {
                        case 'INCAB': studentScoring.scoringsInCab.push(studentScoringItem); break;
                        case 'OUTCAB': studentScoring.scoringsOutCab.push(studentScoringItem); break;
                        case 'BACKING': studentScoring.scoringsBacking.push(studentScoringItem); break;
                        case 'CITY': studentScoring.scoringsCity.push(studentScoringItem); break;
                    }
                    await studentScoring.save()
                }
            }
        }

        // save InstructorScoring - schema is used for quick info search typeof "scoring per a instructor" for instructor analytics
        // react on isAllowed flag in schema
        if (studentScoring.isAllowed) {
            switch (scoringType) {
                case 'INCAB': instructorScoringItem.scoring_str_ref = studentScoring.scoringsInCab[studentScoring.scoringsInCab.length - 1]._id; break;
                case 'OUTCAB': instructorScoringItem.scoring_str_ref = studentScoring.scoringsOutCab[studentScoring.scoringsOutCab.length - 1]._id; break;
                case 'BACKING': instructorScoringItem.scoring_str_ref = studentScoring.scoringsBacking[studentScoring.scoringsBacking.length - 1]._id; break;
                case 'CITY': instructorScoringItem.scoring_str_ref = studentScoring.scoringsCity[studentScoring.scoringsCity.length - 1]._id; break;
            }
            await new InstructorScoring(instructorScoringItem).save()
        }

        // should redirect to INs
        res.status(200).redirect('/admin/student')

    } catch(e) {
        res.status(404).send(`Error: ${e.message}`)
    }

})


// disables/enables isAllow field !!DON'T use ifInstructor as a middleware, bacause it triggers from admins side!!
instRouter.post('/toggle-isallow', async (req, res) => {
    const { scoringId, userId, newIsAllowed } = req.body
    try {
        const scoring = await StudentScoring.findById(scoringId)
        scoring.isAllowed = newIsAllowed === "enable"
        await scoring.save()
        return res.status(200).redirect(`/admin/user/${userId}?activatetab=4`)
    } catch(e) {
        return res.status(404).send(`Error: ${e.message}`)
    }
})




module.exports = instRouter