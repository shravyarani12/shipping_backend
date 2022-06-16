
//const jwt = require('jsonwebtoken');

import jwt from "jsonwebtoken";



export function generateAccessToken(object,callback) {
    jwt.sign({...object}, process.env.TOKEN_SECRET, {expiresIn: '7d'},(err,token)=>{
        return callback(err,token)
    })
}

export function authenticateToken(req, res, next,callback) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    console.log(token)
    if (token == null) return res.sendStatus(401)

    jwt.verify(token, process.env.TOKEN_SECRET, (err, detoken) => {
        let resp={
            user:detoken.userName,
            uId:detoken.uId

        }
        return callback(err,resp)
    })
}
