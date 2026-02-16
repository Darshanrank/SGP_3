import jwt from 'jsonwebtoken'
import {conf} from '../conf/conf.js'

export const signAccessToken =(payload,access = conf.JWT_ACCESS_SECRET )=>{
    return jwt.sign(payload,access,{
        expiresIn:conf.JWT_ACCESS_EXPIRES
    })
}

export const signRefreshToken= (payload,refresh = conf.JWT_REFRESH_SECRET)=>{
    return jwt.sign(payload,refresh,{
        expiresIn:conf.JWT_REFRESH_EXPIRES 
    })
}

export const signUrlToken = (payload, expiresIn = '10m', secret = conf.JWT_ACCESS_SECRET) => {
    return jwt.sign(payload, secret, { expiresIn });
}

export const verifyAccessToken =(token, access = conf.JWT_ACCESS_SECRET)=>{
    return jwt.verify(token,access);
}

export const verifyUrlToken = (token, secret = conf.JWT_ACCESS_SECRET) => {
    return jwt.verify(token, secret);
}

export const verifyRefreshToken =(token,refresh = conf.JWT_REFRESH_SECRET)=>{
    return jwt.verify(token,refresh);
}