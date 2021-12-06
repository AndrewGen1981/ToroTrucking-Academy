const mongoose = require('mongoose')


const { User } = require('../userModel')



// __CONFIG collection is user for configurations
const configSchema = new mongoose.Schema({
    configType: { type: String, required: true },
    lastStudentKey: Number      // autoINC pre.save
}, {
    collection: "__CONFIG"
})


const studentSchema = new mongoose.Schema({
    key: { type: Number, required: true },
    email: { type: String, required: true },
    user: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: User
    },
}, {
    collection: "Student List"
})





module.exports = {
    Student: mongoose.model('Student', studentSchema),
    StudentCONFIG: mongoose.model('StudentCONFIG', configSchema)
}