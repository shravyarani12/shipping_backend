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

import fetch from 'node-fetch';
import { initDBConnection, setupDataListener, storeHistoryItem, updateEntry } from "./helpers/fb-history.js";

initDBConnection();


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())


app.use(cors());

//app.use(authenticate())


setInterval(() => {
    setupDataListener("shippments", async(arr) => {
        for (let i = 0; i < arr.length; i++) {
            let item = arr[i]
            if (item.status != "DELIVERED") {
                const uri = `https://api.goshippo.com/tracks/?carrier=${item.shipper}&tracking_number=${item.trackingNum}`
                const response = await fetch(uri, {
                    method: 'post',
                    body: null,
                    headers: { 'authorization': 'ShippoToken shippo_live_ba9a907276d40482bdc3557ac438d963c238470d' }
                });
                const data = await response.json();
                if (data.tracking_status == "DELIVERED") {
                    //if (true) {
                    updateEntry("shippments", req.body.id, { status: "delivered" }, () => {
                        console.log("Updated Record");
                    })
                }
            }
        }
    })
      
}, 300000)

function authenticate(req, res, next) {
    authenticateToken(req, res, next, (err, user) => {
        if (err) {
            console.log("Auth Failed")
            return res.sendStatus(403)
        }
        else {
            req.user = user.user;
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
                generateAccessToken(item.firstName + "_" + item.lastName, (err, token) => {
                    console.log("Login Success")
                    return res.status(200).json({
                        token: token,
                        "message": "login successful"
                    })
                })
            }

        }
        if (!check) {
            res.status(400).json({
                "message": "login Failed"
            })
        }
    })
})

app.post("/register", (req, res, next) => {
    console.log("register")
    console.log(req)
    storeHistoryItem("profile", { ...req.body }, () => {
        return res.status(200).json({
            "message": "registration done"
        })
    })
})

app.post("/addShippment", authenticate, (req, res, next) => {
    console.log("addShipment")
    let myDate = new Date();
    myDate = myDate.toString();
    storeHistoryItem("shippments", { ...req.body, status: "unknown", userId: req.user, dateAdded: myDate }, () => {
        return res.status(200).json({
            "message": "added shippment done"
        })
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
        headers: { 'authorization': 'ShippoToken shippo_live_ba9a907276d40482bdc3557ac438d963c238470d' }
    });
    const data = await response.json();
    if (data.tracking_status.status == "DELIVERED") {
        //if (true) {
        updateEntry("shippments", req.body.id, { status: "delivered" }, () => {
            console.log("Updated Record");
        })
    }
    return res.status(200).json(data)
})




app.get("/getShipments", authenticate, (req, res, next) => {
    setupDataListener("shippments", (arr) => {
        let ps = [];
        let ds = [];
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].userId == req.user) {
                if (arr[i].status == "delivered") {
                    ds.push(arr[i])
                } else {
                    ps.push(arr[i])
                }
            }
            if (i == arr.length - 1) {
                return res.status(200).json({
                    "pendingShipments": ps,
                    "deliveredShipments": ds,
                })
            }
        }

    })
})



app.listen(8080, (err) => {
    if (!err) {
        console.log("Server Started at:" + 8080);
    }
})
