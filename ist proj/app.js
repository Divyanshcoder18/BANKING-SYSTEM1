const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session'); // only declare once
const flash = require('connect-flash');

const ownerRouter = require("./routes/ownerRouter");
const productRouter = require("./routes/productRouter");
const userRouter = require("./routes/userRouter");
require("dotenv").config();
const db = require("./config/mongoose-connection");

const app = express();
const PORT = 3000;

// Session middleware
app.use(session({
secret: "thisissecretkey",
resave: false,
saveUninitialized: false,
cookie: { secure: false } // keep false for localhost
}));

// Flash messages middleware
app.use(flash());
app.use((req, res, next) => {
res.locals.error = req.flash("error");
res.locals.success = req.flash("success");
next();
});

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.set('view engine', 'ejs');

// Home route
app.get("/", (req, res) => {
res.render("auth");
});

// Routers
// Routers
const indexRouter = require("./routes/index");

app.use("/", indexRouter);
app.use("/owners", ownerRouter);
app.use("/users", userRouter);
app.use("/products", productRouter);



// Server
app.listen(PORT, () => {
console.log(`✅ Server running on http://localhost:${PORT}`);
});

