# CoFlow

CoFlow is a web application for managing study groups and project teams with different user roles and permissions.

## Prerequisites

-   Node.js (v16 or higher recommended)
-   MongoDB (local installation or MongoDB Atlas account)

## Installation

1. Install dependencies

    ```
    npm install
    ```

2. Set up the database
    ```
    npm run seed
    ```

## Running the Application

1. Start the server

    ```
    npm start
    ```

2. Access the application
   Open your browser and navigate to `http://localhost:3000`

## Features

-   User authentication and authorization
-   Study group and project team creation and management
-   Role-based access control
-   Admin dashboard for user management

## Project Structure

-   `/config`: Database connection configuration
-   `/data`: Database operations and business logic
-   `/middleware`: Express middleware functions
-   `/public`: Static assets (CSS, JavaScript, images)
-   `/routes`: Express routes
-   `/views`: View templates
