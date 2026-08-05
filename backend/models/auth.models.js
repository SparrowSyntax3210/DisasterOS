const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AuthSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },      
    email: {
        type: String,
        required: true, 
        unique: true,
    },
    password: { 
        type: String,
        required: true,
    },
    role: {
        type: String,
    },
    Phone: {
        type: String,
        required: true,
    },
    Address: {
        type: String,
        required: true,
    },
    Location: {
        type: String,
        required: true,
    },
    ProfileImage: {
        type: String,
    },
}, { timestamps: true });


module.exports = mongoose.model('Auth', AuthSchema);
