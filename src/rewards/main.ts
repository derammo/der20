import { Configuration } from "./configuration";
import { start } from "derlib/roll20/plugin";

debug.log = console.log;

start('rewards', Configuration);