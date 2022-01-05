// @TOOL for working with User, Applicant and all forms MODELS

const mongoose = require('mongoose')


// IMPORT Models for mongoose
const { User } = require('../users/userModel')      //  USER Model
const { dataCollectionForm } = require('../users/applicants/form1Model')     // FORM1 Model
const { applicationForm } = require('../users/applicants/form2Model')     // FORM2 Model
const { agreementForm } = require('../users/applicants/form3Model')     // FORM3 Model



// @TOOLS

async function getUsers(filter, limit, skip) {
    // LIMIT & SKIP are using for PAGING applicants (in z-order)
    // filter {} and skip 0 to get all

    const title = 'users'
    const headers = [
        { name: 'user' },
        { email: 'email address' },
        { token: 'verified' },
        { created: 'created' },
        { lastSESS: 'last session' },
        { dataCollection: 'data collection form' },
        { application: 'application form' },
        { agreement: 'agreement form' },
        { student: 'is student?' }
    ]


    let html = ""

    // Creating a HEADERS row
    html += `<section class='schema-row' id='schema-headers-${title}'>`     // a row
    html += "<div class='schema-col-index' id='schema-header-index'>#</div>"    // first column - #

    headers.map((header, index) => {
        let key = Object.entries(header)[0][0]
        let text = Object.entries(header)[0][1]
        html += `<div class='schema-col-${key}' id='schema-header-${key}'>${text}</div>`
    })


    html += "</section>"

   
    try {
        const items = await User.find(filter).sort({created: -1}).skip(skip).limit(limit)
                
        items.map(async (item, index) => {
            
            html += `<section class='schema-row' name='schema-row${ index+1 }' id='row-${item._id}'><div class='schema-col-index' id='index-${item._id}'>${ index+1 }</div>`
            
            html += `<a class='schema-col-name' id='name-${item._id}' href='/admin/user/${item._id}'>${item.name}</a>`    //  serves for admin/user/:id
            html += `<div class='schema-col-email' id='email-${item._id}'>${item.email}</div>`

            if (item.token === 'not sent') {
                html += `<div class='schema-col-token' id='token-${item._id}'><p class='token-not-sent'>not sent</p></div>`
            } else {
                if (item.token === 'verified') {
                    html += `<div class='schema-col-token' id='token-${item._id}'><p class='token-verified -step-done'>trusted</p></div>`
                } else {
                    html += `<div class='schema-col-token' id='token-${item._id}'><p class='token-not-confirmed -step-todo'>unsafe</p></div>`
                }
            }

            html += `<div class='schema-col-created' id='created-${item._id}'>${new Date(item.created).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}</div>`
            html += `<div class='schema-col-lastSESS' id='lastSESS-${item._id}'>${new Date(item.lastSESS).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })} ${new Date(item.lastSESS).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles' })}</div>`

            if (item.dataCollection) {
                html += `<div class='schema-col-dataCollection' id='dataCollection-${item._id}'><div class='step -step-done' id='form1-step-${item._id}'>+</div></div>`
            } else {
                html += `<div class='schema-col-dataCollection' id='dataCollection-${item._id}'><div class='step -step-todo' id='form1-step-${item._id}'>-</div></div>`
            }
            
            if (item.application) {
                html += `<div class='schema-col-application' id='application-${item._id}'><div class='step -step-done' id='form2-step-${item._id}'>+</div></div>`
            } else {
                html += `<div class='schema-col-application' id='application-${item._id}'><div class='step -step-todo' id='form2-step-${item._id}'>-</div></div>`
            }

            if (item.agreement) {
                html += `<div class='schema-col-agreement' id='agreement-${item._id}'><div class='step -step-done' id='form3-step-${item._id}'>+</div></div>`
            } else {
                html += `<div class='schema-col-agreement' id='agreement-${item._id}'><div class='step -step-todo' id='form3-step-${item._id}'>-</div></div>`
            }


            if (item.student) {
                html += `<div class='schema-col-student' id='student-${item._id}'><div class='step -step-done' id='student-step-${item._id}'>+</div></div>`
            } else {
                html += `<div class='schema-col-student' id='student-${item._id}'><div class='step -step-todo' id='student-step-${item._id}'>-</div></div>`
            }
 
            html += "</section>"
        })

        return `<div class='schema-${title}' id='schema-${title}'>${html}</div>`
    } catch(e) {
        return `<div class='schema-${title}-error' id='schema-error'>${e}</div>`
    }

}






module.exports = {
    getUsers
}