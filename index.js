require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken")
const mysql = require("mysql");
const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");
const bcrypt = require("bcrypt");
let moment = require("moment");
const cookieParser = require("cookie-parser");
const mailjet = require('node-mailjet').connect('0ab4b7ca282534a8e317bcb38acecfc1', 'f04ded627ac8abf9327df26be746fc12')
const app = express();
const colors = require("colors")

//Token generator
const allCapsAlpha = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const allLowerAlpha = [..."abcdefghijklmnopqrstuvwxyz"];
const allNumbers = [..."0123456789"];
const base = [...allCapsAlpha, ...allNumbers, ...allLowerAlpha];
const generator = (base, len) => {
    return [...Array(len)]
        .map((i) => base[(Math.random() * base.length) | 0])
        .join("");
};


//Middlewares

app.use(cors({
    origin: "*",
    optionsSuccessStatus: 204
}))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

function validateAdminToken(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        res.sendStatus(403)
    } else {
        const token = authHeader.split(" ")[1]
        jwt.verify(token, process.env.JWT_SECRET_ADMIN, (err, auth) => {
            if (err) res.sendStatus(403)
            else {
                req.token = token
                next()
            }
        })
    }
}

function validateUserToken(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        res.sendStatus(403)
    } else {
        const token = authHeader.split(" ")[1]
        console.log(token)
        jwt.verify(token, process.env.JWT_SECRET_USER, (err, auth) => {
            if (err) console.log(err)
            else {
                req.token = token
                next()
            }
        })
    }
}

//DB Connection
let con = mysql.createConnection({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    database: process.env.DB,
    multipleStatements: true,
});
con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
});



//Mailer
app.post("/api/sendverificationmail", (req, res) => {
    console.log(req.body.user);
    let sql = `SELECT Email, Name, Email_Token FROM users WHERE Name = '${req.body.user}';`;
    con.query(sql, function (err, result) {
        const mail = result[0].Email;
        const user = result[0].Name;
        const mailToken = result[0].Email_Token;

        const request = mailjet
            .post("send", { 'version': 'v3.1' })
            .request({
                "Messages": [
                    {
                        "From": {
                            "Email": "Registration@ecominerbyunify.com",
                            "Name": "Ecominer By Unify"
                        },
                        "To": [
                            {
                                "Email": `${mail}`,
                                "Name": `${user}`
                            }
                        ],
                        "Subject": `Email Verification | ${user}`,
                        "HTMLPart": `<div style="margin: 0px;padding: 0px;background-color: rgb(245, 245, 245);font-family: roboto;height: 100%;"> <div style=" width: 100%; background-color: #242424; text-align: center; padding: 8px 0 4px; " > <img data-imagetype="External" src="https://dashboard.ecominerbyunify.com/logo512.png" data-imageproxyendpoint="/actions/ei" alt="Ecominer by Unify" style="color: white;color: white;height: 8vh;padding: 10px;" border="0" /> </div> <div style=" height: 100%; font-family: roboto; background-color: rgb(245, 245, 245); " align="center" > <table style=" background-color: #ffffff; text-align: center; height: 100%; width: 95%; max-width: 50vw; margin: auto; padding-left: 5px; padding-right: 5px; min-width: 40vw; " align="center" > <tbody align="center"> <tr style="height: 10%" align="center"> <td style=" width: 507px; font-weight: bold; line-height: 142%; color: #333333; font-size: 22px; " > <span>Your account has been created</span> <br aria-hidden="true" /><span></span> </td> </tr> <tr style="height: 7%" align="center"> <td style=" line-height: 150%; color: #666666; font-size: 16px; padding-bottom: 10px; " align="center" > <span style=" display: block; margin: auto; max-width: 507px; " > Hello ${user}! <br /> The Ecominer team welcomes you </span> </td> </tr> <tr style="height: 7%" align="center"> <td style=" line-height: 150%; color: #666666; font-size: 16px; padding-bottom: 10px; " align="center" > <span style=" display: block; margin: auto; max-width: 507px; " > Before you start using our services, we need you to <a href="https://dashboard.ecominerbyunify.com/verify/${mailToken}" style="color: #0066cc">verify</a> <strong>your</strong> e-mail. <br /> You can do so by clicking the button below </span> </td> </tr> <tr style="height: 7%"> <td style="padding-top: 10px" align="center"> 
                            <a href="https://dashboard.ecominerbyunify.com/verify/${mailToken}" target="_blank" rel="noopener noreferrer" data-auth="NotApplicable" style=" color: #fff; background: #00b02d; border: none; border-radius: 10px; padding: 10px 40px 10px 40px; font-size: 1rem; font-weight: 600; letter-spacing: 1px; font-family: roboto; cursor: pointer; display: block; max-width: 20%; text-decoration: none; " data-linkindex="0" ><span style="display: block; width: 95%" >Verify</span > </a> </td> </tr> <tr style="height: 3%"> <td style=" font-size: 14px; color: #000; margin-top: 5px; padding-bottom: 7px; " align="center" > <br aria-hidden="true" /> <span style="font-size: 14px; color: #aaaaaa" >Thank you for becoming part of the proyect!</span> </td> </tr> <tr style="height: 7%"> <td style=" font-size: 14px; color: #acacac; margin-top: 5px; padding-bottom: 7px; " align="center" > © <span >Thank You! Ecominer by Unify</span > </td> </tr> <tr></tr> </tbody> </table> </div></div>`
                    }
                ]
            })
        request
            .then((result) => {
                console.log(result.body);
                res.send('OK');
            })
            .catch((err) => {
                console.log('error')
            });
    });
});


//Register
app.post("/api/register", (req, res) => {
    const { user, mail, pass, color } = req.body;
    con.connect(function () {
        let sql = `SELECT * FROM users WHERE Username = '${user}' OR Mail = '${mail}'`
        con.query(sql, (err, result) => {
            if (err) {
                console.log(err);
            } else {
                if (result.length > 0) {
                    let sql = `SELECT * FROM users WHERE Username = '${user}'`
                    con.query(sql, (err, result) => {
                        if (err) {
                            console.log(err);
                        } else {
                            if (result.length > 0) {
                                res.send("Name is already registered");
                            } else {
                                res.send("Email is already registered");
                            }
                        }
                    });


                } else {
                    const plainPass = pass;
                    bcrypt.genSalt(10, function (err, salt) {
                        bcrypt.hash(plainPass, salt, function (err, hash) {

                            let sql = `INSERT INTO users (Username, Mail, Password, Color) VALUES ('${user}', '${mail}', '${hash}', '${color}')`;
                            con.query(sql, (err, result) => {
                                if (err) {
                                    console.log(err);
                                } else {
                                    res.send("Values Inserted");
                                }
                            });

                        });
                    });
                }

            }
        });

    });
});


app.post("/api/contactform", (req, res) => {
    const { address, company, name, text, mail } = req.body;
    const request = mailjet.post("send", { 'version': 'v3.1' }).request({
        "Messages": [
            {
                "From": {
                    "Email": `contact@ecominerbyunify.com`,
                    "Name": `${name}`
                },
                "To": [
                    {
                        "Email": `contact@ecominerbyunify.com`,
                        "Name": `Ecominer by Unify`
                    }
                ],
                "Subject": `${company} | ${address} | ${name}`,
                "HTMLPart": `${company} with address on ${address} and email ${mail} sent you a message: <br> ${text}`
            }
        ]
    })
    request.then((result) => {
        console.log(result.body);
        res.send(address + ' - ' + company + ' - ' + name + ' - ' + text + ' - ' + mail);
    }).catch((err) => {
        console.log('error')
    });
});


app.post("/api/verify", (req, res) => {

    let sql = `UPDATE users SET TF_Verified = 1 WHERE Email_Token= '${req.body.uid}'`;
    console.log(sql);
    con.connect(function () {
        con.query(sql, (err, result) => {
            if (err) {
                console.log(err);
                res.send('404')
            } else {
                console.log(result);
                res.send('200')
            }
        });
    });
});

app.post("/api/changecolor", (req, res) => {
    con.connect(function () {
        let sql = `SELECT * FROM users WHERE Username = '${req.body.user}' AND TF_Active = 1`;
        con.query(sql, (err, results) => {
            let sql = `UPDATE users SET Color = '${req.body.color}' WHERE Username = '${req.body.user}';`;
            con.query(sql, (err, results) => { 
                res.send("Color changed");
            });
        });
    });
});

app.post("/api/changepass", (req, res) => {
    con.connect(function () {
        let sql = `SELECT * FROM users WHERE Username = '${req.body.user}' AND TF_Active = 1`;
        con.query(sql, (err, results) => {
            bcrypt.genSalt(10, function (err, salt) {
                bcrypt.hash(req.body.pass, salt, function (err, hash) {
                    let sql = `UPDATE users SET Password = '${hash}' WHERE Username = '${req.body.user}';`;
                    con.query(sql, (err, results) => { 
                        console.log('pass changed')
                        res.send("pass Changed");
                    });
                });
            });
        });
    });
});

app.post("/api/changename", (req, res) => {
    con.connect(function () {
        let sql = `SELECT * FROM users WHERE Username = '${req.body.user}' AND TF_Active = 1`;
        con.query(sql, (err, results) => {
            let sql = `UPDATE users SET Username = '${req.body.newUser}' WHERE Username = '${req.body.user}';`;
            con.query(sql, (err, results) => { 
                res.send("Name Changed");
            });
        });
    });
});

//LogIn
app.post("/api/login", (req, res) => {
    let hexacolor = 'f44';
    con.connect(function () {
        let sql = `SELECT * FROM users WHERE Username = '${req.body.user}' AND TF_Active = 1`;
        con.query(sql, (err, results) => {
            if (err) {
                console.log(err);
            } else {
                if (results[0]) {
                    bcrypt.compare(
                        req.body.pass,
                        results[0].Password,
                        function (err, result) {
                            if (result) {
                                
                                switch (results[0].Color)
                                {
                                    case "purple":
                                        hexacolor = '8787F3';
                                        break;
                                    case "red":
                                        hexacolor = 'F44';
                                        break;
                                    case "orange":
                                        hexacolor = 'FF9500';
                                        break;    
                                    case "green":
                                        hexacolor = '8FC98E';
                                        break;
                                    case "sky":
                                        hexacolor = '71DDEA';
                                        break;
                                    case "violet":
                                        hexacolor = '840EE3';
                                        break;    
                                }

                                console.log(hexacolor);

                                res.send(
                                    {
                                        userId: results[0].id,
                                        userName: results[0].Username,
                                        color: results[0].Color,
                                        hexacolor
                                    }
                                )
                                console.log({
                                    userId: results[0].id,
                                    userName: results[0].Username,
                                    color: results[0].Color
                                });
                            } else {
                                res.send("Password entered was incorrect");
                            }
                        }
                    );
                } else {
                    console.log('no existe la cuenta');
                    let sql = `SELECT * FROM users WHERE Username = '${req.body.user}'`;
                    con.query(sql, (err, results) => {
                        if (results[0]) {
                            res.send("Account disabled");
                        } else {
                            res.send("Username entered was incorrect");
                        }
                    });
                }
            }
        });
    });
});

app.post("/api/check/user", (req, res) => {
    const { id, type } = req.body
    let sql = `SELECT * FROM users WHERE Id= '${id}'`
    con.query(sql, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            if (result[0] && type != result[0].Type || result[0] && result[0].TF_Active != 1) {
                // de con user
                res.send('disconnect user')
                console.log('disconnect user')
            } else {
                // check correct
                res.send('check correct')
            }
        }
    });
});


//Reset Password
app.post("/api/reset", (req, res) => {
    //uid
    //newPwd
    let sql = `SELECT * FROM users WHERE Pw_token= '${req.body.uid}'`;
    con.query(sql, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            if (result[0]) {
                const user = result[0].Name;
                const mail = result[0].Mail;
                bcrypt.genSalt(10, function (err, salt) {
                    bcrypt.hash(req.body.newPwd, salt, function (err, hash) {
                        let sql = `UPDATE users SET Password = '${hash}', Pw_token = NULL WHERE Pw_token = '${req.body.uid}';`;
                        con.query(sql, (err, result) => {
                            if (err) {
                                console.log(err);
                            } else {

                                const request = mailjet
                                    .post("send", { 'version': 'v3.1' })
                                    .request({
                                        "Messages": [
                                            {
                                                "From": {
                                                    "Email": "Admin@ecominerbyunify.com",
                                                    "Name": "Ecominer By Unify"
                                                },
                                                "To": [
                                                    {
                                                        "Email": `${mail}`,
                                                        "Name": `${user}`
                                                    }
                                                ],
                                                "Subject": `Password has been changed | ${user}`,
                                                "HTMLPart": `<div style="margin: 0px;padding: 0px;background-color: rgb(245, 245, 245);font-family: roboto;height: 100%;"> <div style=" width: 100%; background-color: #242424; text-align: center; padding: 8px 0 4px; " > <img data-imagetype="External" src="https://dashboard.ecominerbyunify.com/logo512.png" data-imageproxyendpoint="/actions/ei" alt="Ecominer by Unify" style="color: white; height: 8vh;padding: 10px;" border="0" /> </div> <div style=" height: 100%; font-family: roboto; background-color: rgb(245, 245, 245); " align="center" > <table style=" background-color: #ffffff; text-align: center; height: 100%; width: 95%; max-width: 50vw; margin: auto; padding-left: 5px; padding-right: 5px; min-width: 40vw; " align="center" > <tbody align="center"> <tr style="height: 10%" align="center"> <td style=" width: 507px; font-weight: bold; line-height: 142%; color: #333333; font-size: 22px; " > <span>You changed your password</span> <br aria-hidden="true" /> </td> </tr> <tr style="height: 7%" align="center"> <td style=" line-height: 150%; color: #666666; font-size: 16px; padding-bottom: 10px; " align="center" > <span style=" display: block; margin: auto; max-width: 507px; " > Hello ${user}! </span> </td> </tr> 
                                        <tr style="height: 7%" align="center"> <td style=" line-height: 150%; color: #666666; font-size: 16px; padding-bottom: 10px; " align="center" > <span style=" display: block; margin: auto; max-width: 507px; " > If this <span style="font-weight: 600; color: #f44">wasn't you</span> , change your password as soon as posible. <br /> You can do this by clicking in 'Forgot your password?' <br /> link in the <a href="https://dashboard.ecominerbyunify.com/login" style="color: #0066cc" >login</a > page. <br /> <br /> </span> </td> </tr> <tr style="height: 7%"> <td style="padding-top: 10px" align="center"> <a href="https://dashboard.ecominerbyunify.com/login" target="_blank" rel="noopener noreferrer" data-auth="NotApplicable" style=" color: #fff; background: #00b02d; border: none; border-radius: 10px; padding: 10px 40px 10px 40px; font-size: 1rem; font-weight: 600; letter-spacing: 1px; font-family: roboto; cursor: pointer; display: block; max-width: 20%; text-decoration: none; " data-linkindex="0" ><span style="display: block; width: 95%" >Here</span > </a> </td> </tr> <tr style="height: 7%"> <td style=" font-size: 14px; color: #acacac; margin-top: 5px; padding-bottom: 7px; " align="center" > <span >Thank You! Ecominer by Unify</span > </td> </tr> <tr></tr> </tbody> </table> </div></div>`
                                            }
                                        ]
                                    })
                                request
                                    .then((result) => {
                                        console.log(result.body)
                                    })
                                    .catch((err) => {
                                        console.log('error')
                                    })
                            }
                        });
                    });
                });

                res.send(result[0]);
            } else {
                //error message
                res.send("expired");
            }
        }
    });
});


app.post("/api/resetrequest", (req, res) => {

    //mail
    const randomToken = generator(base, 20);


    //TODO hacer que el token expire
    let sql = `UPDATE users SET Pw_token = '${randomToken}' WHERE Email = '${req.body.mail}';`;

    con.query(sql, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            if (result.affectedRows > 0) {
                let sql = `SELECT Email, Name FROM users WHERE Email = '${req.body.mail}';`;
                con.query(sql, function (err, result) {
                    const mail = result[0].Email;
                    const user = result[0].Name;

                    const request = mailjet
                        .post("send", { 'version': 'v3.1' })
                        .request({
                            "Messages": [
                                {
                                    "From": {
                                        "Email": "Admin@ecominerbyunify.com",
                                        "Name": "Ecominer By Unify"
                                    },
                                    "To": [
                                        {
                                            "Email": `${mail}`,
                                            "Name": `${user}`
                                        }
                                    ],
                                    "Subject": `Password recovery | ${user}`,
                                    "HTMLPart": `<div style="margin: 0px;padding: 0px;background-color: rgb(245, 245, 245);font-family: roboto;height: 100%;"> <div style=" width: 100%; background-color: #242424; text-align: center; padding: 8px 0 4px; " > <img data-imagetype="External" src="https://dashboard.ecominerbyunify.com/logo512.png" data-imageproxyendpoint="/actions/ei" alt="Ecominer by Unify" style="color: white; height: 8vh;padding: 10px;" border="0" /> </div> <div style=" height: 100%; font-family: roboto; background-color: rgb(245, 245, 245); " align="center" > <table style=" background-color: #ffffff; text-align: center; height: 100%; width: 95%; max-width: 50vw; margin: auto; padding-left: 5px; padding-right: 5px; min-width: 40vw; " align="center" > <tbody align="center"> <tr style="height: 10%" align="center"> <td style=" width: 507px; font-weight: bold; line-height: 142%; color: #333333; font-size: 22px; " > <span>You requested a password recovery</span> <br aria-hidden="true" /> </td> </tr> <tr style="height: 7%" align="center"> <td style=" line-height: 150%; color: #666666; font-size: 16px; padding-bottom: 10px; " align="center" > <span style=" display: block; margin: auto; max-width: 507px; " > Hello ${user}! </span> </td> </tr> <tr style="height: 7%" align="center"> <td style=" line-height: 150%; color: #666666; font-size: 16px; padding-bottom: 10px; " align="center" > <span style=" display: block; margin: auto; max-width: 507px; " > You can <a href="https://dashboard.ecominerbyunify.com/forgotpwd/${randomToken}" >change your password</a > by clicking the button below. </span> </td> </tr> <tr style="height: 7%"> <td style="padding-top: 10px" align="center"> 
                            <a href="https://dashboard.ecominerbyunify.com/forgotpwd/${randomToken}" target="_blank" rel="noopener noreferrer" data-auth="NotApplicable" style=" color: #fff; background: #00b02d; border: none; border-radius: 10px; padding: 10px 40px 10px 40px; font-size: 1rem; font-weight: 600; letter-spacing: 1px; font-family: roboto; cursor: pointer; display: block; max-width: 20%; text-decoration: none; " data-linkindex="0" ><span style="display: block; width: 95%" >Change Password</span > </a> </td> </tr> <tr style="height: 7%" align="center"> <td style=" line-height: 150%; color: #666666; font-size: 16px; padding-bottom: 10px; " align="center" > <span style=" display: block; margin: auto; max-width: 507px; " > If this <span style="font-weight: 600; color: #f44">wasn't you</span>, ignore this e-mail or delete it. </span> </td> </tr> <tr style="height: 7%"> <td style=" font-size: 14px; color: #acacac; margin-top: 5px; padding-bottom: 7px; " align="center" > <span >Thank You! Ecominer by Unify</span > </td> </tr> <tr></tr> </tbody> </table> </div></div>`
                                }
                            ]
                        })
                    request
                        .then((result) => {
                            console.log(result.body)
                        })
                        .catch((err) => {
                            console.log('error')
                        });
                });
                setTimeout(() => {
                    let sql = `UPDATE users SET Pw_token = null WHERE Email = '${req.body.mail}';`;
                    con.query(sql, (err, result) => {
                        console.log('Pass token deleted');
                    });
                }, Number(5 * 60 * 1000));

                res.send('Email sent');
            } else {
                //error message

                res.send("Wrong Email!");
            }
        }
    });
});

app.get('/api/getTest', (req,res) =>{
    con.connect(function () {
        let sql = `SELECT * FROM users;`;
        con.query(sql, (err, result) => {
            if (err) console.log(err)
            else {
                res.send(result);
            }
        });
    });
});


//Get user settings 
app.post('/api/user/settings/get', validateUserToken, (req, res) => {
    con.connect(function () {
        //userid
        const { userid } = req.body
        let sql = `SELECT * FROM users where d = '${userid}'`
        con.query(sql, (err, result) => {
            if (err) console.log(err)
            else {
                if (result[0]) {
                    console.log(result[0])
                    res.send(result[0])
                } else {
                    res.send('No results found')
                }
            }
        })
    })
})

//Delete user
app.post('/api/user/settings/delete', validateUserToken, (req, res) => {
    con.connect(() => {
        const { user, id } = req.body
        let sql = `DELETE FROM users WHERE Name = '${user}'; UPDATE devices SET ID_User = '0', TF_Linked = '0' WHERE ID_User = '${id}' `
        con.query(sql, (err, result) => {
            if (err) console.log(err)
            else {
                console.log(`User with id ${user} has been deleted`)
                res.send('User deleted successfully, we will miss you :(')
            }
        })
    })
})



const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
    console.log(`Locally listening on port 5000, Remote listening on port ${PORT}`);
});