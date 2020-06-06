// Import mongoose
const mongoose = require('mongoose');
var Promise = require('promise');
var emoji = require('node-emoji').emoji;
// const csv = require('csv-parser');
// const fs = require('fs');

// let User = require('./models/users.models');

// Set-up Telegram Bot configuration
require('dotenv').config();
const token_ = process.env.TOKEN;
var TelegramBot = require('node-telegram-bot-api'),
    telegram = new TelegramBot(token_, { polling: true });

//Connect to Mongoose
const uri = process.env.ATLAS_URI;
mongoose.connect(uri, {useNewUrlParser: true, useCreateIndex: true});

//Notify connection
const connection = mongoose.connection;
connection.once('open', () => {
    console.log("MongoDB database connection established");
})

// Create schema for users
var UserSchema = new mongoose.Schema({
    userName: String,
    chatId: String,
    subscription: Array
});

// Create Model for users
var User = mongoose.model('user', UserSchema);

// For testing units
// var User = mongoose.model('user_tests', UserSchema);

// Create Schema for countries
var CountrySchema = new mongoose.Schema({
    country: String,
    total_cases: String,
    new_cases:String,
    total_deaths:String,
    new_deaths:String,
    total_recovered:String,
    active_cases:String,
    serious_critical:String,
    tot_cases_per_m:String,
    death_per_m:String
});

// Create Model for country
var Country = mongoose.model('countries', CountrySchema);

// Read from csv file
// var temp_list = []
// var csv_country = []

// const read_csv = new Promise((resolve, reject) => {
//     fs.createReadStream('./2020_countries.csv')
//     .pipe(csv())
//     .on('data', async function (row) {
//         await temp_list.push(row);
//         // console.log(row);
//         // csv_country.push(obj);
//     })
//     .on('end', async () => {
//         console.log('Successfully read csv');
//         console.log(temp_list.length);
//         for(var i=0; i < temp_list.length;i++) {
//             // console.log(temp_list[i])
//             await csv_country.push(JSON.stringify(temp_list[i]).split(":")[1].replace("}",""));
//             // console.log(JSON.stringify(temp_list[i]).split(":")[1].replace("}",""));
//         }
//     })
//     return resolve(csv_country);
// })



// Telegram chat start
telegram.onText(/\/start/, async (message) => {
    // console.log(csv_country.length);
    chatId_ = message.chat.id
    username_ = message.chat.username;
    var c = [] 
    var newUser = new User({
        userName: username_,
        chatId: chatId_,
        subscription: c
    });

    var subscriptions = []
    await User.find({chatId : chatId_}, function (err, all_users){
        if (err) return console.error(err);
        if (all_users === undefined || all_users.length == 0) {
            newUser.save();
            console.log("Registered new user");
        }
        else{
            subscriptions = all_users[0].subscription;
            // console.log("Recurring user spotted");
        }
    }).catch(err => {
        console.log(err);
    })
    // console.log(subscriptions)

    var options = {
        reply_markup: JSON.stringify({
            // To be replaced by queries from firebase
            inline_keyboard: [
            [{ text: 'Subscribe to countries', callback_data: 'sub' }],
            [{ text: 'Unsubscribe to countries', callback_data: 'unsub' }]
            ]
        })
    };

    var msg = "Welcome to covid-19 status reporter." + emoji.robot_face + "\nWould you like to subscribe or unsubscribe?\n\nSource: worldometers " + emoji.smile; //\n\nSubscriptions:\n
    // subscriptions.forEach(cty => {
    //     msg = msg + cty + "\n";
    // })
    await telegram.sendMessage(message.chat.id, msg, options);

    async function asyncForEach(array) {
        for (let index = 0; index < array.length;  index ++) {
            await  Country.find({country: array[index]}, async function (err, city_info) {
                var new_cases_ = city_info[0].new_cases;
                if (new_cases_ == "") {
                    new_cases_ = "(0)";
                } 
                else {
                    new_cases_ = "(" + new_cases_ + ")";
                }
                var new_deaths_ = city_info[0].new_deaths;
                if (new_deaths_ == "") {
                    new_deaths_ = "(0)";
                }
                else {
                    new_deaths_ = "(" + new_deaths_ + ")";
                }
                var cty_msg = emoji.earth_asia + " " + city_info[0].country + "\n" + emoji.ledger + " Total Cases: " + city_info[0].total_cases + " " + new_cases_ + 
                                "\n" + emoji.closed_book + " Total Deaths: " + city_info[0].total_deaths + " " + new_deaths_ + 
                                "\n" + emoji.green_book + " Total Recovered: " + city_info[0].total_recovered;
                await telegram.sendMessage(message.chat.id, cty_msg); 
        })
    }
    // await telegram.sendMessage(message.chat.id, "Would you like to subscribe or unsubscribe?" , options);
}

    asyncForEach(subscriptions);

})

// Telegram chat for query - subscribe or unsubscribe
telegram.on("callback_query", async (msg) =>{
    const chatId = msg.message.chat.id;
    const query = msg.data
    const messageId = msg.message.message_id;

    var subscriptions = [];
    // Obtain all user's countries
    await User.find({chatId : chatId}, function (err, my_user) {
        subscriptions = my_user[0].subscription;
        // console.log(subscriptions);
    }).then(data => {
        // console.log("Obtained user's countries");
    }).catch((err) => {
        // console.error(err);
    })

    try {
        await telegram.deleteMessage(chatId, messageId);
    }
    catch(e) {
        console.log('multiple clicks');
    }

    // Subscription
    if (query == 'sub') {

        // Obtain all countries
        var keyboard_data = [];
        counter = 0
        await Country.find({})
        .then(async function(all_countries) {

            // console.log(all_countries.length);
            // Prevent bug
            if(all_countries.length == 0) {
                // console.log("retry again");
                return;
            }
            else{
                // console.log("Got all countries!");
            }

            all_countries.forEach(async function(cty) {
                var name = cty['country'];
                var n = subscriptions.includes(name);
                if (!n) {
                    var temp_dict = [{
                        text : name,
                        callback_data: "sub/" + name
                    }];
                    await keyboard_data.push(temp_dict);
                    counter += 1;
                }
            }

            )}).catch(err => {
                // console.log(err);
            })
        
        // console.log("Counter:");
        // console.log(counter);
        var options = {
            reply_markup: JSON.stringify({
                inline_keyboard: keyboard_data
                // 'keyboard' : keyboard_data,
                // one_time_keyboard: true,
            })};
        await telegram.sendMessage(chatId, "Please select the country you wish to subscribe", options);
    }

    // Unsubscribe
    else if (query == 'unsub') {

        var keyboard_data = []
        subscriptions.forEach(name => {
            var temp_dict = [{
                text : name,
                callback_data: "unsub/" + name
            }];
            keyboard_data.push(temp_dict);
        })
        // console.log(keyboard_data);
        var options = {
            reply_markup: JSON.stringify({
                // To be replaced by queries from firebase
                inline_keyboard: keyboard_data
            })
        };
        telegram.sendMessage(chatId, "Please select the country you wish to unsubsribe", options);
    }

    // Countries' name and if it is subscription or not
    else {

        // Add country into the user's profile
        new_query = query.split('/');
        // console.log(new_query);
        if (new_query[0] == "sub") {

            await User.find({chatId : chatId}, function (err, my_user) {
                var c = my_user[0].subscription;
                if (c.includes(new_query[1]) == false) {
                    c.push(new_query[1]);
                    var update_query = {chatId: chatId};
                    my_user[0].subscription = c;
                    my_user[0].save()
                    // console.log("Saved Country");
                }
            }).then(() => {
                // console.log("Updated country");
                telegram.sendMessage(chatId, "You have successfully subscribe to " + new_query[1] );
                return
            }).catch((err) => {
                console.error(err);
            })

        }

        else if (new_query[0] == "unsub") {
            // console.log("Unsubsribing");
            await User.find({chatId : chatId}, function (err, my_user) {
                var c = my_user[0].subscription;
                // console.log(c);
                if (c.includes(new_query[1])) {
                    c = c.filter(e => e !== new_query[1]);
                    var update_query = {chatId: chatId};
                    my_user[0].subscription = c;
                    my_user[0].save()
                }
            }).then(() => {
                // console.log("Updated country");
                telegram.sendMessage(chatId, "You have successfully unsubscribe to " + new_query[1] );
                return
            }).catch((err) => {
                console.error(err);
            })
        }
    }

});


// Telegram chat Update
telegram.onText(/\/update/, async (message) => {
    chatId_ = message.chat.id
    username_ = message.chat.username;
    var c = [] 
    var newUser = new User({
        userName: username_,
        chatId: chatId_,
        subscription: c
    });

    var subscriptions = []
    await User.find({chatId : chatId_}, function (err, all_users){
        if (err) return console.error(err);
        if (all_users === undefined || all_users.length == 0) {
            newUser.save();
            console.log("Registered new user");
        }
        else{
            subscriptions = all_users[0].subscription;
            // console.log("Recurring user spotted");
        }
    }).catch(err => {
        console.log(err);
    })
    // console.log(subscriptions)

    var msg = "Here are your updates for each countries " + emoji.earth_americas;
    await telegram.sendMessage(message.chat.id, msg);

    async function asyncForEach(array) {
        for (let index = 0; index < array.length;  index ++) {
            await  Country.find({country: array[index]}, function (err, city_info) {
                var new_cases_ = city_info[0].new_cases;
                if (new_cases_ == "") {
                    new_cases_ = "(0)";
                } 
                else {
                    new_cases_ = "(" + new_cases_ + ")";
                }
                var new_deaths_ = city_info[0].new_deaths;
                if (new_deaths_ == "") {
                    new_deaths_ = "(0)";
                }
                else {
                    new_deaths_ = "(" + new_deaths_ + ")";
                }
                var cty_msg = emoji.earth_asia + " " + city_info[0].country + "\n" + emoji.ledger + " Total Cases: " + city_info[0].total_cases + " " + new_cases_ + 
                                "\n" + emoji.closed_book + " Total Deaths: " + city_info[0].total_deaths + " " + new_deaths_ + 
                                "\n" + emoji.green_book + " Total Recovered: " + city_info[0].total_recovered;
                telegram.sendMessage(message.chat.id, cty_msg); 
        })
    }}

    asyncForEach(subscriptions);
})

telegram.onText(/\/feedback/, (msg) =>{
    const chatId = msg.chat.id;
    telegram.sendMessage(chatId, "Feedback to developer at https://forms.gle/4MwnBXCrsvFhydT18");
})

telegram.onText(/\/share/, (msg) =>{
    const chatId = msg.chat.id;
    telegram.sendMessage(chatId, "Use COVID-19 Reporter at t.me/covid_reporter_bot");
})