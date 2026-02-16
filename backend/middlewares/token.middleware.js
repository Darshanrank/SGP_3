export const validateTokenMiddleware =(req,res,next)=>{
    const token = req.headers['authorization'];
    if(!token){
        return res.status(401).json({message: 'No token provided'});
    }
    baki;
} 