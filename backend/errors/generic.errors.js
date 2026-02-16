export class AuthError extends Error{
    constructor(message,code = 'AUTH_ERROR'){
        super(message);
        this.name = 'AuthError';
        this.statusCode = 401;
        this.code = code;
    }
}
export class ForbiddenError extends Error{
    constructor(message,code = 'FORBIDDEN'){
        super(message);
        this.name = 'ForbiddenError';
        this.statusCode = 403;
        this.code = code;
    }
}
export class SecurityIncidentError extends Error{
    constructor(message){
        super(message);
        this.name = 'SecurityIncidentError';
        this.statusCode = 401;
        this.code = 'SECURITY_INCIDENT';
        this.severity = "CRITICAL";
    }
}
export class EmailError extends Error{
    constructor(message,code = 'EMAIL_ERROR'){
        super(message);
        this.name = 'EmailError';
        this.statusCode = 550;
        this.code = code;
    }
}

export class NotFound extends Error{
    constructor(message,code = 'NOT_FOUND'){
        super(message);
        this.name = 'NotFound';
        this.statusCode = 404;
        this.code = code;
    }
}
export class ValidationError extends Error{
    constructor(message,code = 'VALIDATION_ERROR'){
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
        this.code = code;
    }
}