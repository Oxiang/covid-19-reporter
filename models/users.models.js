// Import libraries
const mongoose = require('mongoose');

// Calling out schema
const Schema = mongoose.Schema;

const userSchema = new Schema({
    chatId: { type: String, required: true},
    userName: { type:String, required: true},
    subscriptions: { type:Array},
}, {
    collection: 'users'
});

const Users = mongoose.model('users', userSchema);

module.exports = Users;