/* const express = require('express');
const bodyParser = require('body-parser')
//const functions = require("firebase-functions")
const jot = require("./jwt")
require('dotenv').config()
const app = express();
var cors = require('cors'); */


import express from 'express';
import bodyParser from 'body-parser';
//const functions = require("firebase-functions")
import { generateAccessToken, authenticateToken } from "./jwt.js";
import dotenv from "dotenv"
dotenv.config();
const app = express();
import cors from 'cors';
import { uuid } from 'uuidv4';
import fetch from 'node-fetch';
import { initDBConnection, setupDataListener, storeHistoryItem, updateEntry, getEntry, deleteEntry,singlesetupDataListener } from "./helpers/fb-history.js";
import axios from "axios";
initDBConnection();


//--Notifications--
import { Expo } from "expo-server-sdk";

// const sendPushNotification = async (targetExpoPushToken, message) => {
//     const expo = new Expo();
//     const chunks = expo.chunkPushNotifications([
//         { to: targetExpoPushToken, sound: "default", body: message }
//     ]);
// }

import { sendPushNotification } from "./utilities/pushNotifications.js";
//--Notifications--







// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())


app.use(cors());

//app.use(authenticate())


setInterval(() => {
    setupDataListener("shippments", async (arr) => {
        console.log("Cron job started");
        for (let i = 0; i < arr.length; i++) {
            let item = arr[i]
            if (item.status != "DELIVERED") {
                if (item.trackingNum.split("_")[0] == "FF") {
                    singlesetupDataListener(`profile/${item.uId}`, (userDetails) => {
                        updateEntry("shippments", item.id, { status: "DELIVERED" }, async () => {
                            console.log("Updated Record");
                            if (Expo.isExpoPushToken(userDetails["expoToken"])) {
                                await sendPushNotification(userDetails["expoToken"], `${item.name} is Delivered, please check in App`);
                            }
                            //     axios.post(`https://app.nativenotify.com/api/indie/notification`, {
                            //         subID: item.uId,
                            //         appId: 2988,
                            //         appToken: 'KVpPJHcdkZMXyaAsAvsmhz',
                            //         title: `Delivery Update`,
                            //         message: `Checking Delivery`,
                            //         pushData: { yourProperty: "yourPropertyValue" }
                            //    })
                            // //    axios.post(`https://app.nativenotify.com/api/notification`, {
                            // //     appId: 2988,
                            // //     appToken: "KVpPJHcdkZMXyaAsAvsmhz",
                            // //     title: `Delivery Update`,
                            // //     message: `${item.name} is Delivered`,
                            // //     pushData: { yourProperty: "yourPropertyValue" }
                            // //     })
                            //     .then(response => {
                            //         //console.log(response)
                            //         console.log("Notification has been sent for tracking :"+item.trackingNum);
                            //    } )
                            //    .catch(error => {
                            //        console.error('There was an error!', error);
                            //    });

                        })
                    });
                } else {
                    try {
                        const uri = `https://api.goshippo.com/tracks/?carrier=${item.shipper}&tracking_number=${item.trackingNum}`
                        const response = await fetch(uri, {
                            method: 'post',
                            body: null,
                            headers: { 'authorization': `ShippoToken ${process.env.SHIPPO_TOKEN}` }
                        });
                        const data = await response.json();
                        if (data.tracking_status?.status && data.tracking_status?.status == "DELIVERED") {

                            singlesetupDataListener(`profile/${item.uId}`, (userDetails) => {

                                updateEntry("shippments", item.id, { status: "DELIVERED" }, async () => {
                                    console.log("Updated Record");
                                    if (Expo.isExpoPushToken(userDetails["expoToken"])) {
                                        await sendPushNotification(userDetails["expoToken"], `${item.name} is Delivered, please check in App`);
                                    }
                                })
                            });
                            // updateEntry("shippments", item.id, { status: "DELIVERED" }, () => {
                            //     console.log("Updated Record");
                            //     axios.post(`https://app.nativenotify.com/api/indie/notification`, {
                            //         subID: item.uId,
                            //         appId: 2988,
                            //         appToken: 'KVpPJHcdkZMXyaAsAvsmhz',
                            //         title: `Delivery Update`,
                            //         message: `${item.name} is Delivered`
                            //     });
                            // })
                        }
                    }
                    catch (err) {
                        console.log(err)
                    }
                }
            }
            if(i==arr.length-1){
                console.log("Cron job Ended");
            }
        }
        
    })

}, 30000)

function authenticate(req, res, next) {
    authenticateToken(req, res, next, (err, user) => {
        if (err) {
            console.log("Auth Failed")
            return res.sendStatus(403)
        }
        else {
            req.user = user.user;
            req.uId = user.uId
            next()
        }
    })
}

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept'
    );
    next();
});


app.get("/", (req, res, next) => {
    return res.status(200).json({
        "message": "Home page"
    })
});


app.get("/test", (req, res, next) => {
    return res.status(200).json({
        "message": "Welcome"
    })
});

app.post("/login", (req, res, next) => {
    setupDataListener("profile", (arr) => {
        console.log(arr)
        let check = false;
        for (let i = 0; i < arr.length; i++) {
            let item = arr[i];
            if (item.email == req.body.email && item.password == req.body.password) {
                check = true;
                let expotoken=req.body.expoToken?req.body.expoToken:'';
                const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                updateEntry("profile", item.id, { expoToken: req.body.expoToken,lastLoginip:ip }, () => {
                    console.log("Token updated: "+req.body.expoToken)
                    generateAccessToken({ userName: item.firstName + "_" + item.lastName, uId: item.id }, (err, token) => {
                        console.log("Login Success")
                        return res.status(200).json({
                            token: token,
                            id: item.id,
                            "message": "login successful"
                        })
                    })
                })
            }
            if (i==arr.length-1 && check==false) {
                res.status(400).json({
                    "message": "login Failed"
                })
            }
        }
    })
})

app.post("/register", (req, res, next) => {
    console.log("register")
    console.log(req)

    setupDataListener("profile", (arr) => {
        console.log(arr)
        let check = false;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].email == req.body.email) {
                return res.status(403).json({
                    "message": "Account with this email Id already Exists"
                })
            }
            if (i == arr.length - 1) {
                const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                storeHistoryItem("profile", { ...req.body,ip:ip }, () => {
                    return res.status(200).json({
                        "message": "registration done"
                    })
                })
            }
        }
    })
})

app.post("/addShippment", authenticate, (req, res, next) => {
    console.log("addShipment")
    let myDate = new Date();
    myDate = myDate.toString();
    storeHistoryItem("shippments", { ...req.body, uId: req.uId, status: "unknown", userId: req.user, dateAdded: myDate }, async (err, id) => {
        let myDate = new Date();
        myDate = myDate.toString();

        const uri = `https://api.goshippo.com/tracks/?carrier=${req.body.shipper}&tracking_number=${req.body.trackingNum}`
        try {
            const response = await fetch(uri, {
                method: 'post',
                body: null,
                headers: { 'authorization': `ShippoToken ${process.env.SHIPPO_TOKEN}`}
            });
            const data = await response.json();
            if (data.tracking_status?.status && data.tracking_status?.status == "DELIVERED") {
               
                singlesetupDataListener(`profile/${req.uId}`, (arr) => {
                    console.log(arr)
                    updateEntry("shippments", id, { status: "DELIVERED" }, async() => {
                        console.log("Deliverd Updated Record");
                        if (Expo.isExpoPushToken(arr["expoToken"])) {
                            console.log("pushing token");
                            await sendPushNotification(arr["expoToken"], `${req.body.name} is Delivered, please check in App`);
                        }
                    })
                })
                return res.status(200).json(data);
                // updateEntry("shippments", id, { status: "delivered" }, () => {
                //     console.log("Deliverd Updated Record");
                //     axios.post(`https://app.nativenotify.com/api/indie/notification`, {
                //         subID: req.uId,
                //         appId: 2988,
                //         appToken: 'KVpPJHcdkZMXyaAsAvsmhz',
                //         title: `Delivery Update`,
                //         message: `${req.body.name} is Delivered`

                //     });
                //     return res.status(200).json(data)
                // })

            } else {
                return res.status(200).json(data)
            }
        }
        catch (err) {
            return res.status(500).json({ message: "Internal Server Error" })
        }
    })
})


app.post("/tracking", authenticate, async (req, res, next) => {
    console.log("Tracking")
    let myDate = new Date();
    myDate = myDate.toString();
    const uri = `https://api.goshippo.com/tracks/?carrier=${req.body.shipper}&tracking_number=${req.body.trackingNum}`
    const response = await fetch(uri, {
        method: 'post',
        body: null,
        headers: { 'authorization': `ShippoToken ${process.env.SHIPPO_TOKEN}` }
    });
    const data = await response.json();
    if (data.tracking_status?.status && data.tracking_status?.status == "DELIVERED") {
        //if (true) {
        updateEntry("shippments", req.body.id, { status: "delivered" }, () => {
            console.log("Updated Record");
            return res.status(200).json(data)
        })
    } else {
        return res.status(200).json(data)
    }

})




app.get("/getShipments", authenticate, (req, res, next) => {
    console.log("get")
    setupDataListener("shippments", (arr) => {
        let ps = [];
        let ds = [];
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].userId == req.user) {
                if (arr[i].status == "DELIVERED") {
                    ds.push(arr[i])
                } else {
                    ps.push(arr[i])
                }
            }
        }
        return res.status(200).json({
            "pendingShipments": ps,
            "deliveredShipments": ds,
        })
    })
})


app.post("/deleteShipments", authenticate, (req, res, next) => {
    console.log("Delete")
    deleteEntry("shippments",req.body.id,(err) => {
        if(err){
            return res.status(500).json({
                "message":"Deleted Failed"
            })
        }else{
            return res.status(200).json({
                "message":"Deleted Succesfully"
            })
        }
        
    })
})


const port = process.env.PORT || 8080;
app.listen(port, (err) => {
    if (!err) {
        console.log("Server Started at:" + port);
    }
})
