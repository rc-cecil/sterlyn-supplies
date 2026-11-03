import 'dotenv/config';
import {createMailTransport,smtpConfigured} from '../src/lib/notification-delivery';

if(!smtpConfigured()){
 console.error('Email is not configured. Set SMTP_HOST, MAIL_FROM and the SMTP password when a username is supplied. For Gmail, use a Google App Password in your private .env file.');
 process.exitCode=1;
}else{
 const transport=createMailTransport();
 try{
  await transport.verify();
  console.log('SMTP connection and authentication succeeded. No email was sent; sender acceptance and inbox delivery have not been tested.');
 }catch(error){
  const code=(error as {code?:string}).code;
  console.error('SMTP verification failed'+(code?' ('+code+')':'')+'. Check the provider settings and App Password. No email was sent.');
  process.exitCode=1;
 }finally{transport.close();}
}
