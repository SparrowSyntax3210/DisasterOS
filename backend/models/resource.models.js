const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ResourceSchema = new Schema({
    Boats: {
        type: String,
        required: true,
    },
    Ambulance: { 
         type: String,
        required: true,
    },
    Teams: {
        type: Number,
        required: true, 
    },
    Supplies: {
        type: String,
        required: true,
    },
    Equipment: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['available', 'in use', 'maintenance'],
        default: 'available',
    },
    location: {
        type: String,
        required: true,
    },
    lastMaintenance: {
        type: Date,
    },
}, { timestamps: true });

mondule.exports = mongoose.model('Resource', ResourceSchema);