// @ADMIN configuration file
// contains credentials & a list of authorities


// LIST of Authorities
const AUTH = {
    viewOnly: '1',
    editor:   '2',
    admin:    '3',
    canREADset:    [this.viewOnly, this.editor, this.admin],
    canWRITEset:   [this.editor, this.admin],
    canSHAREset:   [this.admin]
}


// Array of admins
const PROFILES = [
    { id: "BigG0001", name: "BigG Admin", title: "admin", email: "alphafleetacc@gmail.com", password: process.env.BIGG0001_PASS, auth: AUTH.admin },
    { id: "Mike0001", name: "Mike Svoboda", title:'admin', email: "newsoundcdl@gmail.com", password: process.env.MIKE0001_PASS, auth: AUTH.editor },
    { id: "Ryan0001", name: "Ryan Kling", title:'president', email: "ryan@torocdl.com", password: process.env.RYAN0001_PASS, auth: AUTH.editor },
    { id: "Mariana0001", name: "Mariana Bulgaru", title:'manager', email: "nwcdlschool@gmail.com", password: process.env.MARIANA0001_PASS, auth: AUTH.editor }
]


// Variants of issues
const ISSUES = {
    wrongIDPASS: "Wrong admin's ID or PASSWORD provided"
}

function findAdminById(id) {
    return PROFILES.find(admin => admin.id.toUpperCase() === id.toUpperCase())
}

module.exports = {
    PROFILES,
    ISSUES,
    findAdminById
}