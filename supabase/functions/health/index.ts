import { environmentStatus, json, preflight } from "../_shared/server.ts";
export default { async fetch(request: Request) { const p=preflight(request); if(p)return p; if(request.method!=="GET")return json({error:"Method not allowed"},405,{Allow:"GET"}); return json({ok:true,app:"Pinky Daily Plan",version:"1.5.0",configured:environmentStatus()}); } };
