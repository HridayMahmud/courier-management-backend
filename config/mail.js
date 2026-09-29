const nodemailer = require('nodemailer');
require('dotenv').config();

//MAIL_TRANSPORT picks how emails are sent:
//  gmail    (default) real emails through Gmail, needs EMAIL_USER and EMAIL_PASS
//  ethereal fake inbox for testing, no account needed, logs a preview link per email
const MAIL_TRANSPORT = (process.env.MAIL_TRANSPORT || "gmail").toLowerCase();

let transporter = null;

const getTransporter = async()=>{
    if(transporter) return transporter;
    if(MAIL_TRANSPORT === "ethereal"){
        const account = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host:account.smtp.host,
            port:account.smtp.port,
            secure:account.smtp.secure,
            auth:{user:account.user, pass:account.pass}
        });
    }else{
        transporter = nodemailer.createTransport({
            service:"gmail",
            auth:{
                user: process.env.EMAIL_USER,
                pass:process.env.EMAIL_PASS
            }
        });
    }
    return transporter;
}

const mailTransport = {
    sendMail: async(options)=>{
        const transport = await getTransporter();
        const info = await transport.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || "Courier App <no-reply@courier.test>",
            ...options
        });
        if(MAIL_TRANSPORT === "ethereal"){
            console.log(`email preview: ${nodemailer.getTestMessageUrl(info)}`);
        }
        return info;
    }
};
module.exports = mailTransport;
