const nodemailer = require('nodemailer');
require('dotenv').config();

//MAIL_TRANSPORT picks how emails are sent:
//  gmail    real emails through Gmail, needs EMAIL_USER and EMAIL_PASS
//  console  nothing is sent, the email is printed in the server terminal (local development)
//  ethereal fake inbox for testing, no account needed, logs a preview link per email
//Left empty: gmail when EMAIL_USER and EMAIL_PASS are set, otherwise console.
const hasGmail = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const MAIL_TRANSPORT = (process.env.MAIL_TRANSPORT || (hasGmail ? "gmail" : "console")).toLowerCase();

const stripHtml = (html)=>String(html || "").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

let transporter = null;

const getTransporter = async()=>{
    if(transporter) return transporter;
    if(MAIL_TRANSPORT === "console"){
        transporter = {
            sendMail: async(options)=>{
                console.log(`\n[email not sent, MAIL_TRANSPORT=console]\n  to: ${options.to}\n  subject: ${options.subject}\n  ${options.text || stripHtml(options.html)}\n`);
                return {messageId:"console"};
            }
        };
    }else if(MAIL_TRANSPORT === "ethereal"){
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
