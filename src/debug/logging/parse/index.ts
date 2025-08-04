import LogInvestigator from "./logInverstigator";

const inv = await LogInvestigator.fromFile("logs.log");
console.log(inv.logs[0]);