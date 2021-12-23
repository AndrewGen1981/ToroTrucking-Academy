const mongoose = require('mongoose')

// @Tuition Schema.
// each Student should have 1 tuition schema
//  shema contains all student's videos and tests

const tuitionSchema = new mongoose.Schema({
    created: { type: Date, default: new Date() },
    
    key: { type: Number, required: true },
    email: { type: String, lowercase: true, required: true },
    student_id_string: { type: String, default: 'not assigned' },       // Student._id will be here, populate will not work - to make modules Student & Tuition separate

    lessons: [{
        watchDate: Date,
        videoID: String,
        videoProgress: Number,
        testProgress: Number
    }]

}, {
    collection: "Lessons"
})

module.exports = {
    Tuition: mongoose.model('tuitionSchema', tuitionSchema)
}