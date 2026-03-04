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

export const signUrlToken = (payload, expiresIn = '10m') => {
    const secret = conf.JWT_URL_SECRET || (conf.JWT_ACCESS_SECRET + '_url');
    return jwt.sign({ ...payload, purpose: 'url' }, secret, { expiresIn });
}

export const verifyAccessToken =(token, access = conf.JWT_ACCESS_SECRET)=>{
    return jwt.verify(token,access);
}

export const verifyUrlToken = (token) => {
    const secret = conf.JWT_URL_SECRET || (conf.JWT_ACCESS_SECRET + '_url');
    const decoded = jwt.verify(token, secret);
    if (decoded.purpose !== 'url') {
        throw new Error('Invalid token purpose');
    }
    return decoded;
}

export const verifyRefreshToken =(token,refresh = conf.JWT_REFRESH_SECRET)=>{
    return jwt.verify(token,refresh);
}

export const decodeToken = (token) => jwt.decode(token);