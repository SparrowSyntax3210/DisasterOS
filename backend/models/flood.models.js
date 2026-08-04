const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const floodSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: {