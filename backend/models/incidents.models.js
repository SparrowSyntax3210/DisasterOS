const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const IncidentSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,   
        required: true,
    },
    Image: {
        type: String,
    },
    DisasterType: {
        type: String,
        required: true,
    },
    GPSLocation: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['open', 'in progress', 'closed'],
        default: 'open',
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    AIAnalysis: {
        type: String,
    },
    StatusUpdate: {
        type: String,
    },
    ReporterID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Incident', IncidentSchema);