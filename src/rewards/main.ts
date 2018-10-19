import { Configuration } from "./configuration";
import { registerHandlers } from "derlib/roll20/plugin";

registerHandlers('rewards', new Configuration());