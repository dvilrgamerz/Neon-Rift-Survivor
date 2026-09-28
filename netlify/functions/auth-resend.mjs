import {json,parse,email,authFetch,limit,safeError} from './_auth.mjs';
export async function handler(event){try{const address=email(parse(event).email);await limit(event,'resend',address);await authFetch('/resend',{body:{type:'signup',email:address}});return json(202,{message:'If the account exists, a verification email is on its way.'});}catch(error){return safeError(error);}}
