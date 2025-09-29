import { Inbound } from 'inbnd'
import { Resend } from 'resend'
import dotenv from 'dotenv'
dotenv.config()

const inbound = new Inbound(process.env.INBOUND_API_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY!)



const { data: resendSendEmail, error: resendSendEmailError } = await resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'delivered@resend.dev',
  subject: 'hello world',
  html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
})

const { data: inboundSendEmail, error: inboundSendEmailError } = await inbound.email.send({
  from: 'hello@agent@inbnd.dev',
  to: 'delivered@resend.dev',
  subject: 'Hello World',
  html: '<h1>Hello World</h1><p>This is your first email!</p>',
})

console.log(resendSendEmail)
console.log(resendSendEmailError)
console.log(inboundSendEmail)
console.log(inboundSendEmailError)