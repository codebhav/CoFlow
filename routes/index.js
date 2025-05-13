import profileRoutes from './profile.js';
import authRoutes from './auth.js';
import homeRoutes from './home.js';
import policyRoutes from './policy.js';
import adminRoutes from './admin.js';
import groupRoutes from './groups.js';
import path from 'path';
import { static as staticDir } from 'express';

const constructorMethod = (app) => {
    app.use('/', homeRoutes);
    app.use('/auth', authRoutes);
    app.use('/admin', adminRoutes);
    app.use('/profile', profileRoutes);
    app.use('/policy', policyRoutes);
    app.use('/groups', groupRoutes);
    app.use('/public', staticDir('public'));

    app.use(/(.*)/, (req, res) => {
        res.status(404).render('error', {
            title: "404 Not Valid Page",
            message: "This page does not implemented yet."
        });
    });

};

export default constructorMethod;