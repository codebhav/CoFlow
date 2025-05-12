/*
You can choose to define all your middleware functions here, 
export them and then import them into your app.js and attach them that that.
add.use(myMiddleWare()). you can also just define them in the app.js if you like as seen in lecture 10's lecture code example. If you choose to write them in the app.js, you do not have to use this file. 
*/


const loggingMiddleware = (req, res, next) => {
    const timestamp = new Date().toUTCString();
    const method = req.method;
    const path = req.path;

    // Check authentication status
    const isAuthenticated = req.session && req.session.user;
    let authStatus = 'Non-Authenticated';

    if (isAuthenticated) {
        authStatus = req.session.user.role === 'superuser' ?
            'Authenticated Super User' :
            'Authenticated User';
    }

    console.log(`[${timestamp}]: ${method} ${path} (${authStatus})`);

    next();
};

const loginRouteMiddleware = (req, res, next) => {
    if (req.session && req.session.user) {
        if (req.session.user.role === 'superuser') {
            return res.redirect('/profile/superuser');
        } else if (req.session.user.role === 'business') {
            return res.redirect('/profile/business');
        } else if (req.session.user.role === 'user') {
            return res.redirect('/profile');
        }
    }
    next();
};
//if login register route redirect to user if not superuser other wise redirect to superuser won't see register page
const signupRouteMiddleware = (req, res, next) => {

    if (req.session && req.session.user) {
        if (req.session.user.role === 'superuser') {
            return res.redirect('/profile/superuser');
        } else if (req.session.user.role === 'business') {
            return res.redirect('/profile/business');
        } else if (req.session.user.role === 'user') {
            return res.redirect('/profile');
        }
    }
    next();
};

// eror page if not superuser
const superuserRouteMiddleware = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/auth/login');
    }
    if (req.session.user.role !== 'admin') {
        return res.status(403).render('error', {
            title: 'Access Denied',
            message: 'You do not have permission to view this page.',
        });
    }

    next();
};
const userRouteMiddleware = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/auth/login');
    }
    if (req.session && req.session.user) {
        if (req.session.user.role !== 'user') {
            return res.status(403).render('error', {
                title: 'Access Denied',
                message: 'You do not have permission to view this page.',
            });
        }
    }

    next();
};

// driect tologin if session end
const signoutRouteMiddleware = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/auth/login');
    }
    next();
};



export default {
    loggingMiddleware,
    loginRouteMiddleware,
    signupRouteMiddleware,
    userRouteMiddleware,
    superuserRouteMiddleware,
    signoutRouteMiddleware
};