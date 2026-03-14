export function log(level:string,message:string,data?:unknown){

  const entry = {
    level,
    message,
    timestamp:new Date().toISOString(),
    data
  }

  console.log(JSON.stringify(entry))
}
