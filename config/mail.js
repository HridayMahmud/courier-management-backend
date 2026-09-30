const nodemailer = require('nodemailer');
require('dotenv').config();

//MAIL_TRANSPORT picks how emails are sent:
//  brevo    Brevo HTTP API (works on hosts that block SMTP, e.g. Render free), needs BREVO_API_KEY
//  gmail    real emails through Gmail SMTP, needs EMAIL_USER and EMAIL_PASS
//  console  nothing is sent, the email is printed in the server terminal (local development)
//  ethereal fake inbox for testing, no account needed, logs a preview link per email
//Left empty: brevo when BREVO_API_KEY is set, else gmail when EMAIL_USER and EMAIL_PASS are set, else console.
const pickTransport = ()=>{
    if(process.env.MAIL_TRANSPORT) return process.env.MAIL_TRANSPORT.toLowerCase();
    if(process.env.BREVO_API_KEY) return "brevo";
    if(process.env.EMAIL_USER && process.env.EMAIL_PASS) return "gmail";
    return "console";
}
const MAIL_TRANSPORT = pickTransport();

//fail fast instead of hanging a request for minutes when the mail service can't be reached
const TIMEOUT_MS = Number(process.env.MAIL_TIMEOUT_MS) || 10000;

const stripHtml = (html)=>String(html || "").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

//"SwiftShip <me@x.com>" -> {name:"SwiftShip", email:"me@x.com"}
const parseAddress = (value)=>{
    const match = String(value || "").match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
    return match ? {name:match[1] || undefined, email:match[2]} : {email:String(value || "").trim()};
}
const fromAddress = ()=>process.env.EMAIL_FROM || process.env.EMAIL_USER || "Courier App <no-reply@courier.test>";

const brevoTransport = {
    sendMail: async(options)=>{
        if(!process.env.BREVO_API_KEY) throw new Error("BREVO_API_KEY is not set");
        const url = process.env.BREVO_API_URL || "https://api.brevo.com/v3/smtp/email";
        const res = await fetch(url,{
            method:"POST",
            headers:{"api-key":process.env.BREVO_API_KEY, "content-type":"application/json", accept:"application/json"},
            body:JSON.stringify({
                sender:parseAddress(options.from || fromAddress()),
                to:[{email:options.to}],
                subject:options.subject,
                htmlContent:options.html,
                textContent:options.text || stripHtml(options.html)
            }),
            signal:AbortSignal.timeout(TIMEOUT_MS)
        });
        if(!res.ok){
            const detail = await res.text().catch(()=>"");
            throw new Error(`Brevo responded ${res.status}: ${detail.slice(0,200)}`);
        }
        return res.json().catch(()=>({}));
    }
};

let transporter = null;

const getTransporter = async()=>{
    if(transporter) return transporter;
    if(MAIL_TRANSPORT === "brevo"){
        transporter = brevoTransport;
    }else if(MAIL_TRANSPORT === "console"){
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
            },
            connectionTimeout:TIMEOUT_MS,
            greetingTimeout:TIMEOUT_MS,
            socketTimeout:TIMEOUT_MS
        });
    }
    return transporter;
}

const mailTransport = {
    transport: MAIL_TRANSPORT,
    sendMail: async(options)=>{
        const transport = await getTransporter();
        const info = await transport.sendMail({from: fromAddress(), ...options});
        if(MAIL_TRANSPORT === "ethereal"){
            console.log(`email preview: ${nodemailer.getTestMessageUrl(info)}`);
        }
        return info;
    }
};
module.exports = mailTransport;
